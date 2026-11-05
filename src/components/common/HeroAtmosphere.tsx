'use client';
// src/components/common/HeroAtmosphere.tsx
// Lightweight CSS-only atmosphere for the Hero Realm banner.
// Dark mode: twinkling stars + sparkles + meteor.
// Light mode: drifting clouds + soaring birds.
// No external animation libraries — uses Tailwind + CSS keyframes from globals.css.

export function HeroAtmosphere({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none ${className}`}
    >
      {/* ── DARK MODE: Stars + Sparkles ─────────────────────────────── */}
      <div className="hidden dark:block absolute inset-0">
        <div className="absolute -top-12 -right-12 w-96 h-96 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-80 h-80 rounded-full bg-indigo-600/20 blur-3xl" />

        {[
          { top: '14%', left: '8%',  size: 'w-1 h-1',   delay: '0s' },
          { top: '22%', left: '22%', size: 'w-1.5 h-1.5', delay: '0.3s' },
          { top: '15%', left: '38%', size: 'w-1 h-1',   delay: '0.7s' },
          { top: '30%', left: '54%', size: 'w-2 h-2',   delay: '1.1s' },
          { top: '12%', left: '72%', size: 'w-1.5 h-1.5', delay: '0.5s' },
          { top: '24%', left: '88%', size: 'w-1 h-1',   delay: '1.4s' },
          { top: '64%', left: '12%', size: 'w-1.5 h-1.5', delay: '0.9s' },
          { top: '78%', left: '28%', size: 'w-1 h-1',   delay: '0.2s' },
          { top: '56%', left: '46%', size: 'w-1.5 h-1.5', delay: '1.6s' },
          { top: '84%', left: '68%', size: 'w-1 h-1',   delay: '0.4s' },
          { top: '68%', left: '84%', size: 'w-2 h-2',   delay: '1.2s' },
          { top: '42%', left: '92%', size: 'w-1 h-1',   delay: '0.8s' },
          { top: '88%', left: '42%', size: 'w-1.5 h-1.5', delay: '1.8s' },
          { top: '40%', left: '4%',  size: 'w-1 h-1',   delay: '2.0s' },
        ].map((star, idx) => (
          <div
            key={idx}
            className={`absolute rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)] ${star.size} animate-pulse`}
            style={{ top: star.top, left: star.left, animationDelay: star.delay, animationDuration: '2.4s' }}
          />
        ))}

        {/* 4-point sparkle stars */}
        {[
          { top: '18%', left: '34%', color: 'text-purple-200', delay: '0.6s' },
          { top: '58%', left: '74%', color: 'text-cyan-200',   delay: '1.3s' },
        ].map((s, i) => (
          <div
            key={i}
            className={`absolute w-4 h-4 ${s.color} drop-shadow-[0_0_8px_currentColor] animate-pulse`}
            style={{ top: s.top, left: s.left, animationDelay: s.delay, animationDuration: '3s' }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
              <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
            </svg>
          </div>
        ))}
      </div>

      {/* ── LIGHT MODE: Clouds + Birds ───────────────────────────────── */}
      <div className="dark:hidden absolute inset-0">
        <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-white/25 blur-3xl" />
        <div className="absolute -bottom-20 -left-12 w-72 h-72 rounded-full bg-sky-300/20 blur-3xl" />

        {/* Cloud 1 */}
        <div
          className="absolute top-1 left-0 w-60 text-white/30"
          style={{ animation: 'cloudDrift 32s linear infinite' }}
        >
          <svg viewBox="0 0 120 50" fill="currentColor" className="w-full h-auto drop-shadow-sm">
            <path d="M 25 40 A 18 18 0 0 1 55 30 A 24 24 0 0 1 95 35 A 15 15 0 0 1 105 45 L 20 45 A 12 12 0 0 1 25 40 Z" />
          </svg>
        </div>

        {/* Cloud 2 */}
        <div
          className="absolute -bottom-2 left-0 w-72 text-sky-100/25"
          style={{ animation: 'cloudDrift 44s linear infinite', animationDelay: '-18s' }}
        >
          <svg viewBox="0 0 140 55" fill="currentColor" className="w-full h-auto drop-shadow-sm">
            <path d="M 30 45 A 20 20 0 0 1 65 32 A 28 28 0 0 1 110 38 A 18 18 0 0 1 125 50 L 22 50 A 14 14 0 0 1 30 45 Z" />
          </svg>
        </div>

        {/* Cloud 3 */}
        <div
          className="absolute top-12 left-0 w-44 text-white/20"
          style={{ animation: 'cloudDrift 26s linear infinite', animationDelay: '-8s' }}
        >
          <svg viewBox="0 0 100 45" fill="currentColor" className="w-full h-auto">
            <path d="M 20 35 A 15 15 0 0 1 45 25 A 20 20 0 0 1 80 30 A 12 12 0 0 1 85 40 L 15 40 A 10 10 0 0 1 20 35 Z" />
          </svg>
        </div>

        {/* Bird 1 */}
        <div
          className="absolute top-6 left-0 text-white/50 w-6 h-4"
          style={{ animation: 'cloudDrift 18s linear infinite' }}
        >
          <svg viewBox="0 0 24 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="w-full h-full drop-shadow-sm">
            <path d="M 1 8 Q 6 1 12 8 Q 18 1 23 8" />
          </svg>
        </div>

        {/* Bird 2 */}
        <div
          className="absolute top-14 left-0 w-4 h-3 text-white/40"
          style={{ animation: 'cloudDrift 22s linear infinite', animationDelay: '-7s' }}
        >
          <svg viewBox="0 0 24 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="w-full h-full">
            <path d="M 1 8 Q 6 2 12 8 Q 18 2 23 8" />
          </svg>
        </div>
      </div>
    </div>
  );
}
