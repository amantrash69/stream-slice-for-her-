import yt_dlp, static_ffmpeg
static_ffmpeg.add_paths()

ydl_opts = {
    "quiet": True,
    "no_warnings": True,
    "skip_download": True,
}

with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    info = ydl.extract_info("https://www.youtube.com/watch?v=dQw4w9WgXcQ", download=False)
    fmts = info.get("formats", [])
    print(f"Total formats: {len(fmts)}")
    for f in fmts:
        h = f.get("height")
        if h and h >= 360:
            fid = f.get("format_id", "?")
            ext = f.get("ext", "?")
            vc = str(f.get("vcodec", "none"))[:15]
            ac = str(f.get("acodec", "none"))[:12]
            tbr = f.get("tbr", 0)
            print(f"  id={fid:10s} height={h:5d}  ext={ext:5s}  vcodec={vc:15s}  acodec={ac:12s}  tbr={tbr}")

print("\nNow testing 'bestvideo+bestaudio/best' format selection:")
ydl_opts2 = {
    "quiet": False,
    "no_warnings": False,
    "skip_download": True,
    "format": "bestvideo+bestaudio/best",
    "simulate": True,
}
with yt_dlp.YoutubeDL(ydl_opts2) as ydl:
    info = ydl.extract_info("https://www.youtube.com/watch?v=dQw4w9WgXcQ", download=False)
    rf = info.get("requested_formats") or [info]
    for f in rf:
        print(f"  SELECTED: id={f.get('format_id')} height={f.get('height')} ext={f.get('ext')} vcodec={f.get('vcodec')} acodec={f.get('acodec')}")
