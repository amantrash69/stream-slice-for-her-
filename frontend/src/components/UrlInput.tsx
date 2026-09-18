import { useState, useRef, useEffect } from 'react';
import { Link2, ClipboardPaste, X, Loader2 } from 'lucide-react';

interface UrlInputProps {
  onFetch: (url: string) => void;
  onClear: () => void;
  loading: boolean;
  hasInfo: boolean;
  error: string | null;
}

function isYouTubeUrl(s: string): boolean {
  return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/.test(s.trim());
}

export function UrlInput({ onFetch, onClear, loading, hasInfo, error }: UrlInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (hasInfo) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!isYouTubeUrl(value)) return;
    debounceRef.current = setTimeout(() => {
      onFetch(value.trim());
    }, 800);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value, hasInfo, onFetch]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setValue(text);
      inputRef.current?.focus();
    } catch {
      inputRef.current?.focus();
    }
  };

  const handleClear = () => {
    setValue('');
    onClear();
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-zinc-400">YouTube URL</label>
      <div className="relative flex items-center gap-2">
        {/* Icon */}
        <div className="absolute left-4 text-zinc-500 pointer-events-none">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
          ) : (
            <Link2 className="w-4 h-4" />
          )}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          id="youtube-url-input"
          type="url"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className={`w-full pl-10 pr-24 py-3.5 rounded-xl border bg-white/[0.04] text-white
            placeholder-zinc-600 text-sm outline-none transition-all duration-200
            focus:bg-white/[0.06] focus:ring-2 focus:ring-indigo-500/50
            ${error ? 'border-red-500/40 focus:ring-red-500/30' : 'border-white/8 focus:border-indigo-500/40'}`}
          onKeyDown={(e) => { if (e.key === 'Enter' && isYouTubeUrl(value)) onFetch(value.trim()); }}
          disabled={loading}
        />

        {/* Action buttons */}
        <div className="absolute right-3 flex items-center gap-1">
          {value && (
            <button
              onClick={handleClear}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all"
              title="Clear"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {!value && (
            <button
              onClick={handlePaste}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-all border border-indigo-500/20"
              title="Paste from clipboard"
            >
              <ClipboardPaste className="w-3 h-3" />
              Paste
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-red-400 inline-block" />
          {error}
        </p>
      )}
    </div>
  );
}
