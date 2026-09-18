import { Scissors, User, ExternalLink } from 'lucide-react';
import { HeroSection } from './components/HeroSection';
import { DownloaderCard } from './components/DownloaderCard';
import { ToastContainer, useToast } from './components/Toast';

function Footer() {
  return (
    <footer className="text-center py-10 px-4 mt-16">
      <div className="flex items-center justify-center gap-2 text-zinc-600 text-sm">
        <Scissors className="w-3.5 h-3.5" />
        <span>StreamSlice — clip without the bloat</span>
      </div>
    </footer>
  );
}

export default function App() {
  const { toasts, addToast, dismiss } = useToast();

  return (
    <div
      className="min-h-screen text-white font-sans antialiased relative transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      {/* Ambient background glows: Top-Left & Bottom-Right */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Top-Left Blob */}
        <div
          className="absolute -top-32 -left-32 w-[650px] h-[650px] rounded-full blur-[140px] pointer-events-none transition-all duration-700"
          style={{ backgroundColor: 'var(--blob-top-left)' }}
        />
        {/* Bottom-Right Blob */}
        <div
          className="absolute -bottom-32 -right-32 w-[650px] h-[650px] rounded-full blur-[140px] pointer-events-none transition-all duration-700"
          style={{ backgroundColor: 'var(--blob-bottom-right)' }}
        />
        {/* Soft center depth */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 50% 20%, transparent 40%, var(--bg) 100%)',
          }}
        />
      </div>

      {/* Header */}
      <header
        className="relative z-10 border-b border-white/5 backdrop-blur-md transition-colors duration-300"
        style={{ backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 75%, transparent)' }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg transition-transform duration-200 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, var(--accent), #8b5cf6)',
                boxShadow: '0 8px 20px -4px var(--blob-top-left)',
              }}
            >
              <Scissors className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">
              Stream<span style={{ color: 'var(--accent)' }}>Slice</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://amantrash69.github.io/portfolio/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white border border-indigo-500/30
                bg-indigo-500/10 hover:bg-indigo-500/20 px-3.5 py-1.5 rounded-full transition-all duration-200 backdrop-blur-sm shadow-sm hover:border-indigo-400/50"
            >
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-medium">About Me</span>
              <ExternalLink className="w-3 h-3 text-zinc-400 opacity-70" />
            </a>
            <div className="flex items-center gap-1 text-xs text-zinc-500 border border-white/8
              px-3 py-1.5 rounded-full bg-white/[0.03] backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              API Ready
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10">
        <HeroSection />
        <DownloaderCard
          onError={(msg) => addToast('error', msg)}
          onSuccess={(msg) => addToast('success', msg)}
        />
        <Footer />
      </main>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
