import os
import re
import shutil
import tempfile
import asyncio
import subprocess
import traceback
import socket
import urllib.request
import json
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

# ---------------------------------------------------------------------------
# Permanent DNS resolution fallback for Windows (fixes Errno 11001 on VPN)
# Queries Cloudflare / Google DoH directly if Windows DNS fails.
# ---------------------------------------------------------------------------
_orig_getaddrinfo = socket.getaddrinfo
_dns_cache: dict = {}


def _fallback_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    try:
        return _orig_getaddrinfo(host, port, family, type, proto, flags)
    except socket.gaierror:
        if isinstance(host, str) and ("." in host):
            if host in _dns_cache:
                try:
                    return _orig_getaddrinfo(_dns_cache[host], port, family, type, proto, flags)
                except Exception:
                    pass
            for dns_url in [
                f"https://1.1.1.1/dns-query?name={host}&type=A",
                f"https://8.8.8.8/resolve?name={host}&type=A",
            ]:
                try:
                    req = urllib.request.Request(
                        dns_url,
                        headers={"Accept": "application/dns-json", "User-Agent": "Mozilla/5.0"},
                    )
                    with urllib.request.urlopen(req, timeout=3) as resp:
                        data = json.loads(resp.read().decode())
                        for ans in data.get("Answer", []):
                            if ans.get("type") == 1 and ans.get("data"):
                                ip = ans["data"]
                                _dns_cache[host] = ip
                                print(f"[DNS RESCUED] {host} -> {ip}")
                                return _orig_getaddrinfo(ip, port, family, type, proto, flags)
                except Exception:
                    continue
        raise


socket.getaddrinfo = _fallback_getaddrinfo

# ---------------------------------------------------------------------------
# Imports (after DNS patch is in place)
# ---------------------------------------------------------------------------
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, field_validator

import yt_dlp
import static_ffmpeg

# Auto-provision FFmpeg binaries (bundled via static-ffmpeg)
static_ffmpeg.add_paths()

# ---------------------------------------------------------------------------
# Thread pool for blocking yt-dlp / ffmpeg work
# ---------------------------------------------------------------------------
_executor = ThreadPoolExecutor(max_workers=4)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
MAX_CLIP_SECONDS = 30 * 60  # 30-minute hard limit

# Optional cookies.txt (Netscape format) in the backend folder.
# Used to bypass YouTube bot-detection / sign-in wall.
COOKIES_FILE = Path(__file__).parent / "cookies.txt"


# ---------------------------------------------------------------------------
# App lifespan
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Check if YOUTUBE_COOKIES env var is provided (useful for Render/Cloud deployment)
    env_cookies = os.environ.get("YOUTUBE_COOKIES") or os.environ.get("YOUTUBE_COOKIES_BASE64")
    if env_cookies:
        try:
            if os.environ.get("YOUTUBE_COOKIES_BASE64"):
                import base64
                data = base64.b64decode(env_cookies).decode("utf-8", errors="replace")
            else:
                data = env_cookies
            COOKIES_FILE.write_text(data, encoding="utf-8")
            print(f"[OK] Injected cookies.txt from environment variable ({len(data)} bytes)")
        except Exception as e:
            print(f"[WARNING] Failed to write cookies from env var: {e}")

    # Check FFmpeg and fallback to static-ffmpeg if not in PATH
    ffmpeg_path = shutil.which("ffmpeg")
    if not ffmpeg_path:
        try:
            import static_ffmpeg
            static_ffmpeg.add_paths()
            ffmpeg_path = shutil.which("ffmpeg")
            print(f"[OK] static_ffmpeg initialized: {ffmpeg_path}")
        except Exception as e:
            print(f"[WARNING] ffmpeg not found and static_ffmpeg fallback failed: {e}")

    if not ffmpeg_path:
        print("[WARNING] ffmpeg not found on PATH — downloads will fail!")
    else:
        result = subprocess.run([ffmpeg_path, "-version"], capture_output=True, text=True)
        print(f"[OK] ffmpeg: {result.stdout.split(chr(10))[0]}")
        print(f"[OK] ffmpeg path: {ffmpeg_path}")
    print(f"[OK] cookies.txt present: {COOKIES_FILE.exists()}")
    yield
    _executor.shutdown(wait=False)


app = FastAPI(title="StreamSlice API", version="5.0.0", lifespan=lifespan)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    from fastapi.responses import JSONResponse
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    print("[GLOBAL ERROR]", exc, flush=True)
    traceback.print_exception(type(exc), exc, exc.__traceback__)
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "trace": traceback.format_exc()},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "Content-Length", "Content-Type"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def parse_timestamp(ts: str) -> float:
    ts = ts.strip()
    if re.fullmatch(r"\d+(\.\d+)?", ts):
        return float(ts)
    parts = ts.split(":")
    if len(parts) == 2:
        return int(parts[0]) * 60 + float(parts[1])
    if len(parts) == 3:
        return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
    raise ValueError(f"Cannot parse timestamp: {ts!r}")


def seconds_to_hms(total: float) -> str:
    total = int(total)
    h, rem = divmod(total, 3600)
    m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


def safe_filename(title: str) -> str:
    """Sanitise a video title for use in a Content-Disposition filename."""
    title = re.sub(r'[\\/*?:"<>|]', "_", title)
    title = re.sub(r"\s+", "_", title.strip())
    return title[:80]  # keep it reasonable


def get_base_ydl_opts(use_cookies: bool = True) -> dict:
    """Return base yt-dlp options with multi-client extractor args, JS runtime, and optional cookies."""
    opts: dict = {
        "js_runtimes": {"node": {}},
        "socket_timeout": 30,
        "retries": 10,
        "fragment_retries": 10,
        "retry_sleep": 2,
        "extractor_args": {
            "youtube": {
                "player_client": ["ios", "android", "mweb", "web"],
            }
        },
    }
    if use_cookies and COOKIES_FILE.exists():
        print(f"[COOKIES] Using cookies file: {COOKIES_FILE}")
        opts["cookiefile"] = str(COOKIES_FILE)
    else:
        print("[COOKIES] Operating without cookies file (using mobile client fallback).")
    return opts


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class InfoRequest(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def must_not_be_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("URL must not be empty")
        return v


class ClipRequest(BaseModel):
    url: str
    start_time: str
    end_time: str
    quality: str = "best"


# ---------------------------------------------------------------------------
# CleanupFileResponse — deletes temp dir AFTER streaming completes
# ---------------------------------------------------------------------------

class CleanupFileResponse(FileResponse):
    def __init__(self, *args, cleanup_dir: str | None = None, **kwargs):
        super().__init__(*args, **kwargs)
        self.cleanup_dir = cleanup_dir

    async def __call__(self, scope, receive, send):
        try:
            await super().__call__(scope, receive, send)
        finally:
            if self.cleanup_dir and os.path.exists(self.cleanup_dir):
                print(f"[CLEANUP] Removing temp dir: {self.cleanup_dir}")
                shutil.rmtree(self.cleanup_dir, ignore_errors=True)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/")
async def root():
    return {"message": "StreamSlice API is running 🎬"}


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "ffmpeg": shutil.which("ffmpeg") is not None,
        "cookies": COOKIES_FILE.exists(),
    }


@app.post("/api/cookies-upload")
async def upload_cookies_file(file: UploadFile):
    content = await file.read()
    if not content:
        raise HTTPException(400, "Empty file uploaded.")
    text = content.decode("utf-8", errors="replace")
    if "# Netscape HTTP Cookie File" not in text and "# HTTP Cookie File" not in text:
        raise HTTPException(
            400,
            "Invalid cookies file. Must be Netscape format (exported by a browser extension).",
        )
    COOKIES_FILE.write_bytes(content)
    print(f"[COOKIES] Saved new cookies.txt ({len(content)} bytes)")
    return {
        "message": (
            f"Cookies saved successfully ({len(content)} bytes). "
            "YouTube bot detection should now be bypassed."
        )
    }


@app.post("/api/info")
async def get_video_info(req: InfoRequest):
    loop = asyncio.get_running_loop()
    ydl_opts = {
        **get_base_ydl_opts(),
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
    }
    try:
        info = await loop.run_in_executor(_executor, _do_info, ydl_opts, req.url)
    except Exception as err_obj:
        err = str(err_obj).lower()
        if "private" in err:
            raise HTTPException(403, "This video is private or requires login.")
        if "not available" in err or "removed" in err:
            raise HTTPException(404, "Video not available (deleted or geo-blocked).")
        raise HTTPException(400, f"Could not fetch video info: {err_obj}")

    duration = info.get("duration")
    is_live = bool(info.get("is_live") or info.get("live_status") == "is_live")

    return {
        "title": info.get("title", "Unknown Title"),
        "thumbnail": info.get("thumbnail") or (info.get("thumbnails") or [{}])[-1].get("url", ""),
        "channel": info.get("uploader") or info.get("channel", "Unknown"),
        "duration_seconds": duration,
        "duration_formatted": seconds_to_hms(duration) if duration else "LIVE",
        "is_live": is_live,
        "view_count": info.get("view_count"),
    }


@app.post("/api/clip")
async def clip_video(req: ClipRequest):
    # ── 1. Parse & validate timestamps ──────────────────────────────────────
    try:
        start_sec = parse_timestamp(req.start_time)
        end_sec   = parse_timestamp(req.end_time)
    except ValueError as e:
        raise HTTPException(422, str(e))

    if start_sec < 0:
        raise HTTPException(422, "Start time cannot be negative.")
    if end_sec <= start_sec:
        raise HTTPException(422, "End time must be after start time.")
    if (end_sec - start_sec) > MAX_CLIP_SECONDS:
        raise HTTPException(422, f"Clip exceeds the {MAX_CLIP_SECONDS // 60}-minute limit.")

    # ── 2. Quality → yt-dlp format string ────────────────────────────────────
    quality = req.quality.lower().strip()
    print(f"[CLIP] quality={quality!r}  range={start_sec:.1f}s–{end_sec:.1f}s")

    ext = "mp4"
    force_kf = False   # True only when we can afford a re-encode (1080p and below)

    if quality == "audio":
        fmt         = "bestaudio/best"
        fmt_sort    = []
        ext         = "m4a"
    elif quality == "1080p":
        fmt         = "bestvideo[height<=1080]+bestaudio/bestvideo[height<=720]+bestaudio/18/22/b/best"
        fmt_sort    = ["fps:60", "fps", "res:1080", "res:720", "vcodec:vp9", "vcodec:h264"]
        force_kf    = True
    elif quality == "720p":
        fmt         = "bestvideo[height<=720]+bestaudio/bestvideo[height<=480]+bestaudio/18/22/b/best"
        fmt_sort    = ["fps:60", "fps", "res:720", "res:480", "vcodec:vp9", "vcodec:h264"]
        force_kf    = True
    elif quality == "480p":
        fmt         = "bestvideo[height<=480]+bestaudio/18/22/b/best"
        fmt_sort    = ["fps", "res:480", "vcodec:vp9", "vcodec:h264"]
        force_kf    = True
    else:
        fmt         = "bv*[fps>=60]+ba/bv*+ba/18/22/b/best"
        fmt_sort    = ["res:2160", "res:1440", "res:1080", "res:720", "fps:60", "fps",
                       "vcodec:vp9", "vcodec:h264"]
        force_kf    = False

    print(f"[CLIP] format={fmt!r}  force_keyframes={force_kf}")

    # ── 3. First pass: fetch title for the output filename ───────────────────
    info_opts = {**get_base_ydl_opts(), "quiet": True, "no_warnings": True, "skip_download": True}
    try:
        loop       = asyncio.get_running_loop()
        info       = await loop.run_in_executor(_executor, _do_info, info_opts, req.url)
        video_title = safe_filename(info.get("title", "clip"))
    except Exception:
        video_title = "clip"

    # ── 4. Download ──────────────────────────────────────────────────────────
    tmp_dir       = tempfile.mkdtemp(prefix="streamslice_")
    out_template  = os.path.join(tmp_dir, "raw.%(ext)s")
    ffmpeg_path   = shutil.which("ffmpeg")

    ydl_opts: dict = {
        **get_base_ydl_opts(),
        "format":                      fmt,
        "outtmpl":                     out_template,
        "quiet":                       False,
        "no_warnings":                 False,
        "ffmpeg_location":             ffmpeg_path,
        "merge_output_format":         "mp4" if quality != "audio" else None,
        "download_ranges":             yt_dlp.utils.download_range_func(None, [(start_sec, end_sec)]),
        "force_keyframes_at_cuts":     force_kf,
        "concurrent_fragment_downloads": 8,
        "buffersize":                  1024 * 1024,
        "http_chunk_size":             10 * 1024 * 1024,
    }
    if fmt_sort:
        ydl_opts["format_sort"] = fmt_sort
    if quality == "audio":
        ydl_opts["postprocessors"] = [{"key": "FFmpegExtractAudio", "preferredcodec": "m4a"}]

    try:
        await loop.run_in_executor(_executor, _do_download, ydl_opts, req.url)
    except Exception as e:
        traceback.print_exc()
        shutil.rmtree(tmp_dir, ignore_errors=True)
        raise HTTPException(500, f"Download failed: {e}")

    # ── 5. Post-process: PTS/DTS normalisation + clean AAC audio ─────────────
    out_files = [p for p in Path(tmp_dir).iterdir() if p.is_file()]
    print(f"[CLIP] raw output files: {[f.name for f in out_files]}")

    if not out_files:
        shutil.rmtree(tmp_dir, ignore_errors=True)
        raise HTTPException(500, "No output file was produced.")

    raw_path = max(out_files, key=lambda p: p.stat().st_size)

    if quality != "audio" and ffmpeg_path:
        final_mp4    = Path(tmp_dir) / "final.mp4"
        clip_duration = end_sec - start_sec   # exact intended duration in seconds

        # Strict A/V synchronization flags:
        # Hard-limits both streams to exact clip_duration and uses -shortest with libx264 -crf 18
        # so video frames terminate at the exact millisecond audio ends.
        # Eliminates the 3-4s silent video freeze caused by DASH keyframe overshooting.
        preset = "veryfast" if quality == "best" else "fast"
        cmd = [
            ffmpeg_path, "-y",
            "-i", str(raw_path),
            "-t", str(clip_duration),         # hard-limit output to exact requested duration
            "-avoid_negative_ts", "make_zero",
            "-fflags", "+genpts",
            "-async", "1",
            "-max_muxing_queue_size", "2048",
            "-c:v", "libx264",
            "-crf", "18",
            "-preset", preset,
            "-c:a", "aac", "-b:a", "192k",
            "-shortest",                      # terminate immediately when shorter stream ends
            "-movflags", "+faststart",
            str(final_mp4),
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode == 0 and final_mp4.exists() and final_mp4.stat().st_size > 0:
            raw_path.unlink(missing_ok=True)
            out_path = final_mp4
            print(f"[CLIP] Final (AAC, exact {clip_duration:.1f}s, no audio cutout): {out_path.stat().st_size / 1024 / 1024:.2f} MB")
        else:
            print(f"[WARNING] FFmpeg post-process failed (returncode={res.returncode}):\n{res.stderr[-400:]}")
            out_path = raw_path   # fall back to raw merged file
    else:
        out_path = raw_path



    # ── 6. Serve ─────────────────────────────────────────────────────────────
    size_mb = out_path.stat().st_size / 1024 / 1024
    print(f"[CLIP] serving {out_path.name} ({size_mb:.1f} MB)")

    s_label       = seconds_to_hms(start_sec).replace(":", "-")
    e_label       = seconds_to_hms(end_sec).replace(":", "-")
    download_name = f"{video_title}_{s_label}_to_{e_label}.{ext}"

    media_type = "audio/mp4" if quality == "audio" else "video/mp4"
    return CleanupFileResponse(
        path=str(out_path),
        filename=download_name,
        media_type=media_type,
        cleanup_dir=tmp_dir,
    )


STRATEGIES = [
    {
        "player_client": ["ios", "android", "mweb"],
        "player_skip": ["configs", "webpage"],
    },
    {
        "player_client": ["android_vr", "web_creator", "mweb"],
        "player_skip": ["webpage"],
    },
    {
        "player_client": ["mweb", "web"],
    },
    None,
]

def _do_info(opts: dict, url: str) -> dict:
    last_err = None
    if COOKIES_FILE.exists():
        for strat in STRATEGIES:
            o = dict(opts)
            o["cookiefile"] = str(COOKIES_FILE)
            if strat:
                o["extractor_args"] = {"youtube": strat}
            try:
                with yt_dlp.YoutubeDL(o) as ydl:
                    return ydl.extract_info(url, download=False)
            except Exception as e:
                last_err = e

    for strat in STRATEGIES:
        o = dict(opts)
        o.pop("cookiefile", None)
        if strat:
            o["extractor_args"] = {"youtube": strat}
        try:
            with yt_dlp.YoutubeDL(o) as ydl:
                return ydl.extract_info(url, download=False)
        except Exception as e:
            last_err = e

    # Ultimate fallback: Official YouTube oEmbed API (Never blocked on Datacenter IPs)
    try:
        m = re.search(r"(?:v=|\/|shorts\/)([a-zA-Z0-9_-]{11})", url)
        video_id = m.group(1) if m else url
        oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
        req = urllib.request.Request(oembed_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            print(f"[OEMBED FALLBACK] Successfully fetched info for {video_id}")
            return {
                "title": data.get("title", "YouTube Video"),
                "thumbnail": data.get("thumbnail_url") or f"https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg",
                "uploader": data.get("author_name", "Unknown Channel"),
                "channel": data.get("author_name", "Unknown Channel"),
                "duration": 600,
                "is_live": False,
            }
    except Exception as e:
        last_err = e

    raise last_err or RuntimeError("Could not fetch video info using any strategy.")


def _do_download(opts: dict, url: str):
    last_err = None
    if COOKIES_FILE.exists():
        for strat in STRATEGIES:
            o = dict(opts)
            o["cookiefile"] = str(COOKIES_FILE)
            if strat:
                o["extractor_args"] = {"youtube": strat}
            try:
                with yt_dlp.YoutubeDL(o) as ydl:
                    return ydl.download([url])
            except Exception as e:
                last_err = e

    for strat in STRATEGIES:
        o = dict(opts)
        o.pop("cookiefile", None)
        if strat:
            o["extractor_args"] = {"youtube": strat}
        try:
            with yt_dlp.YoutubeDL(o) as ydl:
                return ydl.download([url])
        except Exception as e:
            last_err = e

    raise last_err or RuntimeError("Could not download video using any strategy.")


# ---------------------------------------------------------------------------
# Optional: Mount frontend build (for Docker / unified single-port hosting)
# ---------------------------------------------------------------------------

frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if not frontend_dist.exists():
    frontend_dist = Path(__file__).resolve().parent / "dist"

if frontend_dist.exists() and (frontend_dist / "index.html").exists():
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
    print(f"[OK] Mounted frontend static files from: {frontend_dist}")


# ---------------------------------------------------------------------------
# Entry-point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)

