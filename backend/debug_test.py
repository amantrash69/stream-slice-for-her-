import yt_dlp, static_ffmpeg, tempfile, os, shutil, traceback
from pathlib import Path
static_ffmpeg.add_paths()

tmp_dir = tempfile.mkdtemp(prefix='test_')
out_template = os.path.join(tmp_dir, 'clip.%(ext)s')
ffmpeg_path = shutil.which('ffmpeg')
print('ffmpeg path:', ffmpeg_path)

ydl_opts = {
    'format': 'bestvideo+bestaudio/best',
    'outtmpl': out_template,
    'quiet': False,
    'no_warnings': False,
    'ffmpeg_location': ffmpeg_path,
    'merge_output_format': 'mp4',
    'download_ranges': yt_dlp.utils.download_range_func(None, [(5.0, 15.0)]),
    'force_keyframes_at_cuts': False,
    'concurrent_fragment_downloads': 4,
}
try:
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download(['https://www.youtube.com/watch?v=dQw4w9WgXcQ'])
    files = list(Path(tmp_dir).iterdir())
    print('SUCCESS. Files:', files)
    for f in files:
        print(f'  {f.name}: {f.stat().st_size/1024:.0f} KB')
except Exception as e:
    print('EXCEPTION:', type(e).__name__, str(e)[:500])
    traceback.print_exc()
