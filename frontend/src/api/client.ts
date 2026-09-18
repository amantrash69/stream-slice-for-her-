import axios from 'axios';
import type { VideoInfo, ClipRequest } from '../types';

// Determine API base URL:
// 1. Explicit environment variable (e.g. VITE_API_URL set in GitHub Secrets or .env.production)
// 2. If running on localhost/127.0.0.1 -> http://127.0.0.1:8000
// 3. If hosted together on the same domain (Docker / VPS) -> relative ''
const rawBaseUrl =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:8000'
    : '');

export const BASE_URL = rawBaseUrl.replace(/\/+$/, '');

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60s timeout for video info, allowing Render free tier cold-starts
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.message === 'Network Error' || !err.response) {
      err.message =
        'Cannot connect to backend server. If using a free cloud backend (e.g. Render), please wait 45-60 seconds for it to wake up from sleep, then try again.';
    }
    return Promise.reject(err);
  }
);

export async function fetchVideoInfo(url: string): Promise<VideoInfo> {
  const { data } = await api.post<VideoInfo>('/api/info', { url });
  return data;
}

export async function downloadClip(
  req: ClipRequest,
  onProgress?: (step: number) => void
): Promise<void> {
  onProgress?.(1); // analyzing

  // Use a long timeout — 4K clips can take 2-3 minutes to download + mux
  // AbortController lets us cancel if something goes really wrong
  const controller = new AbortController();
  const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes max
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api/clip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Download timed out after 10 minutes. Try a shorter clip.');
    }
    // Network error (backend not running, CORS, etc.)
    throw new Error(
      'Cannot reach backend server. If using Render free tier, the server may be waking up (please wait ~45s) or verify the backend is running.'
    );
  }

  clearTimeout(timer);
  onProgress?.(2); // fetching

  if (!response.ok) {
    let detail = `Server error: ${response.status}`;
    try {
      const err = await response.json();
      detail = err.detail || detail;
    } catch {
      // ignore json parse error
    }
    throw new Error(detail);
  }

  onProgress?.(3); // remuxing done, now downloading blob to browser

  const contentDisposition = response.headers.get('content-disposition') ?? '';
  const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
  const filename = filenameMatch ? filenameMatch[1] : 'clip.mp4';

  const blob = await response.blob();

  onProgress?.(4); // saving file

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function checkHealth(): Promise<{ ffmpeg: boolean }> {
  const { data } = await api.get('/api/health');
  return data;
}
