import { useState, useEffect, useRef } from 'react';
import { Clock, Plus, SlidersHorizontal, AlertTriangle } from 'lucide-react';
import { parseSeconds, formatHMS } from '../utils/time';

interface TimestampControlsProps {
  startTime: string;
  endTime: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  maxSeconds?: number | null;
  quality?: string;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function addSecondsClamped(ts: string, delta: number, maxLimit?: number | null): string {
  const sec = parseSeconds(ts) ?? 0;
  let next = sec + delta;
  if (maxLimit && maxLimit > 0) {
    next = clamp(next, 0, maxLimit);
  } else {
    next = Math.max(0, next);
  }
  return formatHMS(next);
}

function ClipLengthBadge({ start, end, maxSec, quality }: { start: string; end: string; maxSec?: number | null; quality?: string }) {
  const startSec = parseSeconds(start);
  const endSec = parseSeconds(end);

  const isInvalid = startSec === null || endSec === null || endSec <= startSec;
  const isExceedingMax = maxSec && endSec !== null && endSec > maxSec;

  if (isInvalid) {
    return (
      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Start time must be before end time.</span>
      </div>
    );
  }

  if (isExceedingMax) {
    return (
      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
        <span>End time ({end}) exceeds video duration ({formatHMS(maxSec)}).</span>
      </div>
    );
  }

  const diff = endSec - startSec;
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = Math.floor(diff % 60);
  let label = '';
  if (h > 0) label += `${h}h `;
  if (m > 0) label += `${m}m `;
  label += `${s}s`;

  // Estimate download size based on quality (bitrate in Mbps)
  const bitrateMap: Record<string, number> = {
    best: 10,     // ~10 Mbps (4K/2160p av1)
    '1080p': 4,   // ~4 Mbps
    '720p': 2,    // ~2 Mbps
    '480p': 1,    // ~1 Mbps
    audio: 0.128, // ~128 kbps
  };
  const bitrateMbps = bitrateMap[quality ?? 'best'] ?? 10;
  const sizeMB = (bitrateMbps * diff) / 8;
  let sizeLabel = '';
  if (sizeMB < 1) {
    sizeLabel = `~${Math.round(sizeMB * 1024)} KB`;
  } else {
    sizeLabel = `~${sizeMB.toFixed(1)} MB`;
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-fuchsia-500/10 border border-indigo-500/20 backdrop-blur-sm shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-indigo-300 font-medium">
            Clip Duration: <span className="text-white font-bold tracking-wide">{label.trim()}</span>
          </span>
          <span className="text-[11px] text-zinc-400">
            Est. size: <span className="text-zinc-200 font-semibold font-mono">{sizeLabel}</span>
          </span>
        </div>
      </div>
      {maxSec && (
        <span className="text-[11px] text-zinc-500 font-medium">
          Max: <span className="text-zinc-300 font-mono">{formatHMS(maxSec)}</span>
        </span>
      )}
    </div>
  );
}

function DualTimelineScrubber({
  startSec,
  endSec,
  maxSec,
  onChangeStart,
  onChangeEnd,
}: {
  startSec: number;
  endSec: number;
  maxSec: number;
  onChangeStart: (sec: number) => void;
  onChangeEnd: (sec: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeThumb, setActiveThumb] = useState<'start' | 'end' | null>(null);

  const startPercent = clamp((startSec / maxSec) * 100, 0, 100);
  const endPercent = clamp((endSec / maxSec) * 100, 0, 100);

  const getSecFromPointer = (e: React.PointerEvent | PointerEvent) => {
    if (!trackRef.current || maxSec <= 0) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const x = clamp(e.clientX - rect.left, 0, rect.width);
    return Math.round((x / rect.width) * maxSec);
  };

  const handlePointerDownStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setActiveThumb('start');
  };

  const handlePointerDownEnd = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setActiveThumb('end');
  };

  const handlePointerMoveStart = (e: React.PointerEvent) => {
    if (activeThumb !== 'start') return;
    const sec = getSecFromPointer(e);
    if (sec < endSec) onChangeStart(sec);
  };

  const handlePointerMoveEnd = (e: React.PointerEvent) => {
    if (activeThumb !== 'end') return;
    const sec = getSecFromPointer(e);
    if (sec > startSec) onChangeEnd(sec);
  };

  const handlePointerUp = () => setActiveThumb(null);

  const handleTrackClick = (e: React.MouseEvent) => {
    if (activeThumb) return;
    const sec = getSecFromPointer(e as unknown as React.PointerEvent);
    const distToStart = Math.abs(sec - startSec);
    const distToEnd = Math.abs(sec - endSec);
    if (distToStart < distToEnd) {
      if (sec < endSec) onChangeStart(sec);
    } else {
      if (sec > startSec) onChangeEnd(sec);
    }
  };

  return (
    <div className="space-y-2.5 p-4 rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-md shadow-inner">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-semibold text-zinc-300">
          <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
          Interactive Timeline Range
        </span>
        <span className="text-[11px] text-zinc-400 font-mono bg-black/30 px-2 py-0.5 rounded-md border border-white/5">
          {formatHMS(startSec)} ➔ {formatHMS(endSec)}
        </span>
      </div>

      <div
        ref={trackRef}
        onClick={handleTrackClick}
        className="relative h-7 flex items-center select-none cursor-pointer group py-1"
      >
        {/* Track Background */}
        <div className="absolute inset-x-0 h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/10 shadow-inner">
          <div
            className="absolute h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 rounded-full shadow-sm shadow-indigo-500/50"
            style={{
              left: `${startPercent}%`,
              width: `${Math.max(0, endPercent - startPercent)}%`,
            }}
          />
        </div>

        {/* Start Handle */}
        <div
          role="slider"
          aria-label="Start time handle"
          aria-valuenow={startSec}
          onPointerDown={handlePointerDownStart}
          onPointerMove={handlePointerMoveStart}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="absolute -translate-x-1/2 top-1/2 -translate-y-1/2 z-20 cursor-grab active:cursor-grabbing touch-none group/start"
          style={{ left: `${startPercent}%` }}
        >
          <div className="w-5 h-5 rounded-full bg-indigo-500 border-2 border-indigo-200 shadow-md shadow-indigo-500/60 hover:scale-125 group-active/start:scale-125 transition-transform flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-indigo-950/90 border border-indigo-500/40 text-[10px] text-indigo-200 font-mono font-semibold whitespace-nowrap shadow-lg backdrop-blur-md">
            Start: {formatHMS(startSec)}
          </div>
        </div>

        {/* End Handle */}
        <div
          role="slider"
          aria-label="End time handle"
          aria-valuenow={endSec}
          onPointerDown={handlePointerDownEnd}
          onPointerMove={handlePointerMoveEnd}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="absolute -translate-x-1/2 top-1/2 -translate-y-1/2 z-20 cursor-grab active:cursor-grabbing touch-none group/end"
          style={{ left: `${endPercent}%` }}
        >
          <div className="w-5 h-5 rounded-full bg-fuchsia-500 border-2 border-fuchsia-200 shadow-md shadow-fuchsia-500/60 hover:scale-125 group-active/end:scale-125 transition-transform flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-fuchsia-950/90 border border-fuchsia-500/40 text-[10px] text-fuchsia-200 font-mono font-semibold whitespace-nowrap shadow-lg backdrop-blur-md">
            End: {formatHMS(endSec)}
          </div>
        </div>
      </div>

      <div className="flex justify-between text-[10px] text-zinc-500 font-mono pt-0.5">
        <span>0:00</span>
        <span>{formatHMS(maxSec / 2)}</span>
        <span>{formatHMS(maxSec)}</span>
      </div>
    </div>
  );
}

function TimestampField({
  id,
  label,
  value,
  onChange,
  onAddPreset,
  maxSec,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onAddPreset: (delta: number) => void;
  maxSec?: number | null;
}) {
  const [focused, setFocused] = useState(false);

  const presets = [
    { label: '+30s', delta: 30 },
    { label: '+1m', delta: 60 },
    { label: '+5m', delta: 300 },
  ];

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </label>
      <div
        className={`relative flex items-center rounded-xl border bg-white/[0.03] backdrop-blur-sm transition-all duration-200
          ${focused ? 'border-indigo-500/60 ring-2 ring-indigo-500/20 bg-white/[0.06]' : 'border-white/8 hover:border-white/15'}`}
      >
        <Clock className="w-4 h-4 text-zinc-500 absolute left-3.5 pointer-events-none" />
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            setFocused(false);
            const parsed = parseSeconds(value);
            if (parsed !== null && maxSec && maxSec > 0 && parsed > maxSec) {
              onChange(formatHMS(maxSec));
            }
          }}
          onFocus={() => setFocused(true)}
          placeholder="0:00"
          className="w-full bg-transparent pl-10 pr-4 py-3 text-sm font-mono text-white placeholder-zinc-600 outline-none"
        />
      </div>
      <div className="flex gap-1.5 pt-0.5">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => onAddPreset(p.delta)}
            className="flex items-center gap-0.5 px-2.5 py-1 rounded-lg text-[11px] font-medium
              text-zinc-400 border border-white/6 bg-white/[0.02]
              hover:text-indigo-300 hover:border-indigo-500/30 hover:bg-indigo-500/10
              transition-all duration-150 cursor-pointer active:scale-95"
          >
            <Plus className="w-2.5 h-2.5" />
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TimestampControls({
  startTime,
  endTime,
  onStartChange,
  onEndChange,
  maxSeconds,
  quality,
}: TimestampControlsProps) {
  const currentStartSec = parseSeconds(startTime) ?? 0;
  const currentEndSec = parseSeconds(endTime) ?? (maxSeconds || 0);

  useEffect(() => {
    if (!maxSeconds || maxSeconds <= 0) return;
    if (currentEndSec > maxSeconds) onEndChange(formatHMS(maxSeconds));
    if (currentStartSec >= maxSeconds) onStartChange(formatHMS(Math.max(0, maxSeconds - 10)));
  }, [maxSeconds]);

  return (
    <div className="space-y-4">
      {maxSeconds && maxSeconds > 0 ? (
        <DualTimelineScrubber
          startSec={clamp(currentStartSec, 0, maxSeconds)}
          endSec={clamp(currentEndSec, 0, maxSeconds)}
          maxSec={maxSeconds}
          onChangeStart={(sec) => onStartChange(formatHMS(sec))}
          onChangeEnd={(sec) => onEndChange(formatHMS(sec))}
        />
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        <TimestampField
          id="start-time"
          label="Start Time"
          value={startTime}
          onChange={onStartChange}
          onAddPreset={(delta) => onStartChange(addSecondsClamped(startTime, delta, maxSeconds))}
          maxSec={maxSeconds}
        />
        <TimestampField
          id="end-time"
          label="End Time"
          value={endTime}
          onChange={onEndChange}
          onAddPreset={(delta) => onEndChange(addSecondsClamped(endTime, delta, maxSeconds))}
          maxSec={maxSeconds}
        />
      </div>

      <ClipLengthBadge start={startTime} end={endTime} maxSec={maxSeconds} quality={quality} />
    </div>
  );
}

