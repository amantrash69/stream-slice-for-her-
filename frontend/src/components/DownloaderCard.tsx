import { useState, useCallback, useEffect } from 'react';
import { Scissors } from 'lucide-react';
import { UrlInput } from './UrlInput';
import { VideoPreview } from './VideoPreview';
import { TimestampControls } from './TimestampControls';
import { parseSeconds } from '../utils/time';
import { QualitySelector } from './QualitySelector';
import { ActionButton } from './ActionButton';
import { ProgressIndicator } from './ProgressIndicator';
import { useVideoInfo } from '../hooks/useVideoInfo';
import { useClipDownload } from '../hooks/useClipDownload';
import type { Quality } from '../types';

interface DownloaderCardProps {
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

export function DownloaderCard({ onError, onSuccess }: DownloaderCardProps) {
  const [url, setUrl] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [quality, setQuality] = useState<Quality>('best');

  const { info, loading: infoLoading, error: infoError, fetchInfo, reset: resetInfo } = useVideoInfo();
  const { step, error: clipError, startDownload, reset: resetClip } = useClipDownload();

  // Auto-set default start and end times when video metadata loads
  useEffect(() => {
    if (info?.duration_seconds) {
      setStartTime('0:00');
      setEndTime(info.duration_formatted);
    }
  }, [info]);

  const handleFetch = useCallback((fetchedUrl: string) => {
    setUrl(fetchedUrl);
    fetchInfo(fetchedUrl);
  }, [fetchInfo]);

  const handleClear = useCallback(() => {
    setUrl('');
    setStartTime('');
    setEndTime('');
    resetInfo();
    resetClip();
  }, [resetInfo, resetClip]);

  const handleDownload = async () => {
    // Client-side validation
    if (!url) { onError('Please enter a YouTube URL.'); return; }
    if (!startTime) { onError('Please enter a start time.'); return; }
    if (!endTime) { onError('Please enter an end time.'); return; }

    if (info?.is_live) {
      onError('Cannot clip a currently live stream. Wait for the stream to finish and video to be available.');
      return;
    }

    const startSec = parseSeconds(startTime);
    const endSec = parseSeconds(endTime);

    if (startSec === null || endSec === null) {
      onError('Invalid timestamp format. Use MM:SS or HH:MM:SS format.');
      return;
    }

    if (startSec < 0) {
      onError('Start time cannot be negative.');
      return;
    }

    if (endSec <= startSec) {
      onError('Start time must be before end time.');
      return;
    }

    if (info?.duration_seconds && endSec > info.duration_seconds) {
      onError(`End time (${endTime}) cannot exceed video length (${info.duration_formatted}).`);
      return;
    }

    resetClip();
    try {
      await startDownload({ url, start_time: startTime, end_time: endTime, quality });
      onSuccess('Your clip is downloading! 🎉');
    } catch {
      // error state is already set in the hook
    }
  };

  // Propagate clip errors to toast
  const lastClipError = clipError;

  return (
    <div className="max-w-2xl mx-auto px-4">
      <div
        className="relative rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden"
        style={{ backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 80%, transparent)' }}
      >

        {/* Top glow line with accent color */}
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: 'linear-gradient(to right, transparent, var(--accent), transparent)' }}
        />

        {/* Card header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/6">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
              border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
            }}
          >
            <Scissors className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h2 className="font-semibold text-white text-sm">Clip Downloader</h2>
            <p className="text-xs text-zinc-500">Enter a URL, set timestamps, pick quality</p>
          </div>
        </div>

        {/* Card body */}
        <div className="p-6 space-y-6">
          <UrlInput
            onFetch={handleFetch}
            onClear={handleClear}
            loading={infoLoading}
            hasInfo={!!info}
            error={infoError}
          />

          {info && <VideoPreview info={info} />}

          {(info || startTime || endTime) && (
          <TimestampControls
              startTime={startTime}
              endTime={endTime}
              onStartChange={setStartTime}
              onEndChange={setEndTime}
              maxSeconds={info?.duration_seconds}
              quality={quality}
            />
          )}

          {(info || startTime || endTime) && (
            <QualitySelector value={quality} onChange={setQuality} />
          )}

          <ActionButton
            step={step}
            onClick={step === 'done' || step === 'error' ? resetClip : handleDownload}
            disabled={!url || infoLoading || step === 'analyzing' || step === 'fetching' || step === 'remuxing' || step === 'downloading'}
          />

          <ProgressIndicator step={step} error={lastClipError} />
        </div>
      </div>
    </div>
  );
}
