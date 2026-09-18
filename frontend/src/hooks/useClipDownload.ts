import { useState, useCallback } from 'react';
import { downloadClip } from '../api/client';
import type { ClipRequest, DownloadStep } from '../types';

export function useClipDownload() {
  const [step, setStep] = useState<DownloadStep>('idle');
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const startDownload = useCallback(async (req: ClipRequest) => {
    setStep('analyzing');
    setStepIndex(1);
    setError(null);

    try {
      await downloadClip(req, (s) => {
        setStepIndex(s);
        if (s === 1) setStep('analyzing');
        else if (s === 2) setStep('fetching');
        else if (s === 3) setStep('remuxing');
        else if (s === 4) setStep('downloading');
      });
      setStep('done');
      setStepIndex(4);
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message ?? 'Download failed.';
      setError(msg);
      setStep('error');
    }
  }, []);

  const reset = useCallback(() => {
    setStep('idle');
    setStepIndex(0);
    setError(null);
  }, []);

  return { step, stepIndex, error, startDownload, reset };
}
