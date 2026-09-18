// Shared timestamp utility functions
// IMPORTANT: Keep this file component-free so TimestampControls.tsx
// can satisfy React Fast Refresh (only one default export = React component)

export function parseSeconds(ts: string): number | null {
  const s = ts.trim();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  const parts = s.split(':');
  if (parts.length === 2) {
    const [m, sec] = parts.map(Number);
    if (isNaN(m) || isNaN(sec)) return null;
    return m * 60 + sec;
  }
  if (parts.length === 3) {
    const [h, m, sec] = parts.map(Number);
    if (isNaN(h) || isNaN(m) || isNaN(sec)) return null;
    return h * 3600 + m * 60 + sec;
  }
  return null;
}

export function formatHMS(totalSec: number): string {
  const t = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
