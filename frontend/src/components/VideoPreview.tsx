import { Eye, Radio, Clock } from 'lucide-react';
import type { VideoInfo } from '../types';

function formatViews(n: number | null): string {
  if (!n) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K views`;
  return `${n} views`;
}

interface VideoPreviewProps {
  info: VideoInfo;
}

export function VideoPreview({ info }: VideoPreviewProps) {
  return (
    <div className="flex gap-4 p-4 rounded-xl border border-white/8 bg-white/[0.03] backdrop-blur-sm
      animate-in fade-in slide-in-from-bottom-2 duration-400">
      {/* Thumbnail */}
      <div className="flex-shrink-0 relative">
        <img
          src={info.thumbnail}
          alt={info.title}
          className="w-32 h-20 object-cover rounded-lg border border-white/8"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        {info.is_live && (
          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5
            rounded-md bg-red-600 text-white text-[10px] font-bold">
            <Radio className="w-2.5 h-2.5" />
            LIVE
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <h3 className="font-semibold text-sm text-white leading-snug line-clamp-2 mb-1">
            {info.title}
          </h3>
          <p className="text-xs text-zinc-500">{info.channel}</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-600">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {info.duration_formatted}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {formatViews(info.view_count)}
          </span>
        </div>
      </div>
    </div>
  );
}
