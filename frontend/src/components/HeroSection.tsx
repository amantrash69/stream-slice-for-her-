import { Scissors, Zap, Target, Flame, Music, Shield } from 'lucide-react';

const features = [
  {
    icon: Scissors,
    title: 'Lossless Cuts',
    desc: 'Stream-copy trimming — no re-encode quality loss on the bulk of the clip.',
  },
  {
    icon: Zap,
    title: '4K / 60fps',
    desc: 'Fetches the highest-quality DASH stream fragments YouTube offers.',
  },
  {
    icon: Shield,
    title: 'Instant Chunking',
    desc: 'Downloads only your timestamp range — never the full multi-hour video.',
  },
  {
    icon: Music,
    title: 'Audio-Only Export',
    desc: 'Extract just the audio as AAC M4A with perfect quality.',
  },
];

export function HeroSection() {
  return (
    <section className="relative text-center py-16 md:py-20 px-4 overflow-hidden">
      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Headline */}
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white text-center">
          Clip Any YouTube Stream <br />
          <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
            in Seconds at Maximum Quality
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-4 max-w-2xl mx-auto text-center text-zinc-400 text-sm md:text-base leading-relaxed">
          Snip exact stream moments in <span className="text-white font-medium underline decoration-violet-500/50 underline-offset-4">lossless quality</span>. 
          StreamSlice isolates and downloads only your selected timestamp range — skipping multi-hour video bloat entirely.
        </p>

        {/* Pills */}
        <div className="flex flex-wrap justify-center gap-2 mt-6 mb-12">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/25 text-pink-300 text-xs font-medium backdrop-blur-md">
            <Zap className="w-3.5 h-3.5 text-pink-400" />
            Instant Segment Extraction
          </span>
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-medium backdrop-blur-md">
            <Target className="w-3.5 h-3.5 text-rose-400" />
            Frame-Accurate Cuts
          </span>
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-300 text-xs font-medium backdrop-blur-md">
            <Flame className="w-3.5 h-3.5 text-violet-400" />
            Zero Full-Video Bloat
          </span>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="group flex flex-col items-center gap-3 p-5 rounded-2xl border border-white/10
                bg-zinc-900/60 backdrop-blur-md hover:bg-zinc-900/80 hover:border-white/20
                transition-all duration-300"
            >
              <div
                className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20
                  flex items-center justify-center group-hover:bg-pink-500/20 transition-colors"
              >
                <Icon className="w-5 h-5 text-pink-400" />
              </div>
              <div>
                <p className="font-semibold text-sm text-white mb-1">{title}</p>
                <p className="text-xs text-zinc-400 leading-snug">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
