import { Loader2, Scissors, Download, CheckCircle2 } from 'lucide-react';
import type { DownloadStep } from '../types';

interface ActionButtonProps {
  step: DownloadStep;
  onClick: () => void;
  disabled?: boolean;
}

const labels: Record<DownloadStep, string> = {
  idle: 'Cut & Download Clip',
  analyzing: 'Analyzing stream...',
  fetching: 'Fetching segment...',
  remuxing: 'Remuxing with FFmpeg...',
  downloading: 'Preparing download...',
  done: 'Download Complete!',
  error: 'Try Again',
};

export function ActionButton({ step, onClick, disabled }: ActionButtonProps) {
  const isLoading = ['analyzing', 'fetching', 'remuxing', 'downloading'].includes(step);
  const isDone = step === 'done';
  const isIdle = step === 'idle' || step === 'error';

  return (
    <button
      id="cut-download-btn"
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`relative w-full py-4 px-6 rounded-xl font-semibold text-sm
        flex items-center justify-center gap-2.5
        transition-all duration-300 overflow-hidden
        disabled:opacity-60 disabled:cursor-not-allowed
        ${isDone
          ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
          : isLoading
          ? 'bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 cursor-wait'
          : `bg-gradient-to-r from-indigo-600 to-violet-600 text-white border border-indigo-500/50
              hover:from-indigo-500 hover:to-violet-500 hover:shadow-lg hover:shadow-indigo-500/25
              active:scale-[0.98] cursor-pointer`
        }`}
    >
      {/* Shimmer overlay for idle state */}
      {isIdle && !disabled && (
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent
          -translate-x-full animate-[shimmer_2.5s_infinite] pointer-events-none" />
      )}

      {/* Icon */}
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isDone ? (
        <CheckCircle2 className="w-4 h-4" />
      ) : step === 'error' ? (
        <Scissors className="w-4 h-4" />
      ) : (
        <>
          <Scissors className="w-4 h-4" />
          <Download className="w-4 h-4" />
        </>
      )}

      {labels[step]}
    </button>
  );
}
