export interface VideoInfo {
  title: string;
  thumbnail: string;
  channel: string;
  duration_seconds: number | null;
  duration_formatted: string;
  is_live: boolean;
  view_count: number | null;
}

export type Quality = 'best' | '1080p' | '720p' | '480p' | 'audio';

export interface ClipRequest {
  url: string;
  start_time: string;
  end_time: string;
  quality: Quality;
}

export type DownloadStep =
  | 'idle'
  | 'analyzing'
  | 'fetching'
  | 'remuxing'
  | 'downloading'
  | 'done'
  | 'error';

export interface Toast {
  id: string;
  type: 'error' | 'success' | 'info';
  message: string;
}
