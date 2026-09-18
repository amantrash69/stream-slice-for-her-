# StreamSlice 🎬

**Clip any YouTube video or stream by timestamp — no full-VOD download, maximum quality.**

Powered by `yt-dlp` and `FFmpeg` for lossless segment extraction.

---

## ⚙️ Prerequisites

| Tool | Install Command |
|---|---|
| Python 3.10+ | [python.org](https://python.org) |
| Node.js 18+ | [nodejs.org](https://nodejs.org) |
| ffmpeg | `winget install Gyan.FFmpeg` (Windows) · `brew install ffmpeg` (macOS) · `sudo apt install ffmpeg` (Linux) |
| pip | Included with Python |

> **ffmpeg must be on your system PATH.** The backend will warn you on startup if it can't find it.

## ⚡ One-Click Launchers (Fastest)

### Windows
Double-click `start_app.bat` in the root folder.  
It automatically starts the backend, starts the frontend, and opens Google Chrome to `http://localhost:5173`.

### macOS / Linux
Run the executable script:
```bash
chmod +x start_app.sh
./start_app.sh
```
Press `Ctrl + C` in the terminal to gracefully stop both servers.

### VS Code / Antigravity Task
Press `Ctrl+Shift+P` (or `Cmd+Shift+P`) → **Tasks: Run Task** → **Launch Full App & Open Chrome** (or press the Play button).

---

## 🚀 Manual Start

### 1. Clone / open the project

```bash
# Project is at:
cd streamslice/
```

### 2. Start the Backend

```bash
cd backend

# Create and activate a virtual environment (recommended)
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload --port 8000
```

The API will be live at **http://localhost:8000**.  
You can explore the auto-generated docs at **http://localhost:8000/docs**.

### 3. Start the Frontend

Open a new terminal:

```bash
cd frontend

# Install dependencies (first time only)
npm install

# Start the dev server
npm run dev
```

The app will open at **http://localhost:5173**.

---

## 📡 API Reference

### `GET /api/health`
Returns `{ "status": "ok", "ffmpeg": true/false }`.

### `POST /api/info`
Fetch video metadata without downloading.

**Request body:**
```json
{ "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }
```

**Response:**
```json
{
  "title": "Rick Astley - Never Gonna Give You Up",
  "thumbnail": "https://...",
  "channel": "Rick Astley",
  "duration_seconds": 212,
  "duration_formatted": "3:32",
  "is_live": false,
  "view_count": 1500000000
}
```

### `POST /api/clip`
Download a time-range clip.

**Request body:**
```json
{
  "url": "https://www.youtube.com/watch?v=...",
  "start_time": "1:30",
  "end_time": "2:00",
  "quality": "best"
}
```

Quality options: `best` · `1080p` · `720p` · `audio`

Timestamps accept: `SS` · `MM:SS` · `HH:MM:SS`

**Response:** Binary `.mp4` (or `.m4a`) file with `Content-Disposition: attachment`.

---

## 🗂️ Project Structure

```
streamslice/
├── backend/
│   ├── main.py            # FastAPI application
│   └── requirements.txt   # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── api/           # Axios API client
│   │   ├── components/    # React components
│   │   │   ├── HeroSection.tsx
│   │   │   ├── DownloaderCard.tsx
│   │   │   ├── UrlInput.tsx
│   │   │   ├── VideoPreview.tsx
│   │   │   ├── TimestampControls.tsx
│   │   │   ├── QualitySelector.tsx
│   │   │   ├── ActionButton.tsx
│   │   │   ├── ProgressIndicator.tsx
│   │   │   └── Toast.tsx
│   │   ├── hooks/         # Custom React hooks
│   │   │   ├── useVideoInfo.ts
│   │   │   └── useClipDownload.ts
│   │   ├── types/         # TypeScript types
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── index.html
│   └── vite.config.ts
└── README.md
```

---

## 🔒 Limitations & Notes

- **Clip length cap**: Single clips are capped at **30 minutes** to prevent abuse (configurable in `backend/main.py` via `MAX_CLIP_SECONDS`).
- **Live streams**: Cannot clip currently live broadcasts. Wait for the VOD to be published.
- **Private / geo-blocked videos**: Will return a clear error message.
- **Age-restricted content**: May require a YouTube cookie (not currently supported in this version).
- **Temp files**: Clips are stored temporarily in the OS temp directory and deleted automatically after download completes.

---

## 🌐 Free Cloud Deployment (GitHub Pages + Render)

You can host StreamSlice completely for free:
- **Frontend**: Hosted for free on **GitHub Pages**
- **Backend**: Hosted for free on **Render** (via Docker with FFmpeg pre-installed)

### Part 1: Deploy Backend to Render (Free)
1. Push your project to GitHub.
2. Log in to [render.com](https://render.com) and click **New +** $\to$ **Web Service**.
3. Connect your repository.
4. Set:
   - **Name:** `streamslice-backend`
   - **Runtime:** **Docker** (Uses `backend/Dockerfile` with FFmpeg and Node.js)
   - **Plan:** **Free** ($0/month)
5. Under **Environment Variables**:
   - Add `YOUTUBE_COOKIES`: Copy & paste the contents of your `backend/cookies.txt` here to bypass YouTube bot detection.
6. Click **Deploy Web Service**.
   - Render will generate a URL like `https://streamslice-backend.onrender.com`.

> **Note on Render Free Tier:** The free service sleeps after 15 minutes of inactivity. When you make your first request, allow 45–60 seconds for it to spin back up.

### Part 2: Deploy Frontend to GitHub Pages (Free)
1. In your GitHub repository, go to **Settings** $\to$ **Pages**.
2. Under **Build and deployment** $\to$ **Source**, choose **GitHub Actions**.
3. Add your Render backend URL as a Repository Variable:
   - Go to **Settings** $\to$ **Secrets and variables** $\to$ **Actions** $\to$ **Variables** tab.
   - Click **New repository variable**.
   - Name: `VITE_API_URL`
   - Value: `https://streamslice-backend.onrender.com` (your Render URL)
4. Push a commit to `main`. The included workflow (`.github/workflows/deploy.yml`) will automatically build and publish your site at `https://<your-username>.github.io/<repo-name>/`!

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python · FastAPI · yt-dlp · FFmpeg |
| Frontend | React 19 · Vite · Tailwind CSS v4 · Lucide Icons |
| HTTP Client | Axios + native Fetch (for blob streaming) |
