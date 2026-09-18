import { Monitor, Tv2, Music, Crown } from 'lucide-react';
import type { Quality } from '../types';

interface QualityOption {
  value: Quality;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  isDefault?: boolean;
}

const OPTIONS: QualityOption[] = [
  {
    value: 'best',
    label: 'Best / Max',
    sublabel: '4K · 1440p · 1080p60',
    icon: Crown,
    isDefault: true,
  },
  {
    value: '1080p',
    label: '1080p HD',
    sublabel: 'Full HD',
    icon: Monitor,
  },
  {
    value: '720p',
    label: '720p',
    sublabel: 'HD Ready',
    icon: Tv2,
  },
  {
    value: 'audio',
    label: 'Audio Only',
    sublabel: 'M4A · No Video',
    icon: Music,
  },
];

interface QualitySelectorProps {
  value: Quality;
  onChange: (v: Quality) => void;
}

export function QualitySelector({ value, onChange }: QualitySelectorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-zinc-300">Quality</label>
        <span className="text-[11px] text-zinc-400 bg-white/[0.04] border border-white/8 px-2 py-0.5 rounded-md">
          Default: Best / Max
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              id={`quality-${opt.value}`}
              onClick={() => onChange(opt.value)}
              className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border text-center
                transition-all duration-200 cursor-pointer
                ${selected
                  ? 'border-indigo-500/70 bg-indigo-500/20 ring-2 ring-indigo-500/25 shadow-lg shadow-indigo-500/15'
                  : 'border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]'
                }`}
            >
              {/* Default badge on "best" */}
              {opt.isDefault && (
                <span className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold px-1.5 py-0.5 rounded-full border whitespace-nowrap
                  ${selected
                    ? 'bg-indigo-500 border-indigo-400 text-white'
                    : 'bg-zinc-700 border-white/15 text-zinc-300'
                  }`}>
                  DEFAULT
                </span>
              )}
              <Icon
                className={`w-5 h-5 mt-1 transition-colors ${selected ? 'text-indigo-300' : 'text-zinc-400'}`}
              />
              <div>
                <p className={`text-xs font-semibold ${selected ? 'text-indigo-100' : 'text-zinc-200'}`}>
                  {opt.label}
                </p>
                <p className={`text-[10px] mt-0.5 ${selected ? 'text-indigo-300/80' : 'text-zinc-400'}`}>{opt.sublabel}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
