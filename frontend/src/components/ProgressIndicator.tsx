import { Search, Download, Cpu, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { DownloadStep } from '../types';

interface ProgressIndicatorProps {
  step: DownloadStep;
  error: string | null;
}

const STEPS = [
  {
    id: 1,
    key: 'analyzing',
    icon: Search,
    label: 'Analyzing video stream…',
    sublabel: 'Fetching available formats',
  },
  {
    id: 2,
    key: 'fetching',
    icon: Download,
    label: 'Downloading clip segment…',
    sublabel: 'High-res clips can take 1–3 min, please wait',
  },
  {
    id: 3,
    key: 'remuxing',
    icon: Cpu,
    label: 'Remuxing with FFmpeg…',
    sublabel: 'Merging video + audio into MP4',
  },
  {
    id: 4,
    key: 'downloading',
    icon: CheckCircle2,
    label: 'Saving to your device!',
    sublabel: 'Your download should start automatically',
  },
];

const stepOrder: Record<string, number> = {
  idle: 0,
  analyzing: 1,
  fetching: 2,
  remuxing: 3,
  downloading: 4,
  done: 4,
  error: -1,
};

export function ProgressIndicator({ step, error }: ProgressIndicatorProps) {
  if (step === 'idle') return null;

  const current = stepOrder[step] ?? 0;

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Processing</p>
        {step !== 'error' && step !== 'done' && (
          <span className="flex items-center gap-1.5 text-[11px] text-amber-400/80">
            <Loader2 className="w-3 h-3 animate-spin" />
            Do not close this tab
          </span>
        )}
      </div>

      {step === 'error' && error ? (
        <div className="flex items-start gap-3 text-red-400">
          <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">Download failed</p>
            <p className="text-xs text-red-400/70 mt-0.5">{error}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {STEPS.map(({ id, icon: Icon, label, sublabel }) => {
            const done = current > id || step === 'done';
            const active = current === id;
            return (
              <div
                key={id}
                className={`flex items-start gap-3 text-sm transition-all duration-300 ${
                  done
                    ? 'text-emerald-400'
                    : active
                    ? 'text-indigo-300'
                    : 'text-zinc-600'
                }`}
              >
                <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0
                  border transition-all duration-300
                  ${done
                    ? 'border-emerald-500/40 bg-emerald-500/15'
                    : active
                    ? 'border-indigo-500/50 bg-indigo-500/15 ring-2 ring-indigo-500/20'
                    : 'border-white/8 bg-white/[0.03]'
                  }`}>
                  {done ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : active ? (
                    <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                  ) : (
                    <Icon className="w-3 h-3" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{label}</span>
                  {active && (
                    <p className="text-[11px] text-zinc-500 mt-0.5">{sublabel}</p>
                  )}
                </div>
                {active && (
                  <span className="flex gap-0.5 mt-2 ml-auto">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
