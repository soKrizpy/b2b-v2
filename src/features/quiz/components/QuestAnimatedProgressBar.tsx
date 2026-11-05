'use client';
// src/features/quiz/components/QuestAnimatedProgressBar.tsx
// Quest Map progress bar — CSS-only transitions (no motion/react, no canvas-confetti).

import { Star, Sparkles, Flag, Crown, CheckCircle2 } from 'lucide-react';

interface QuestAnimatedProgressBarProps {
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
  moduleTitle?: string | null;
}

export function QuestAnimatedProgressBar({
  completedCount,
  totalCount,
  isComplete,
}: QuestAnimatedProgressBarProps) {
  const targetPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const milestones = [
    { pct: 25,  label: 'Jejak Awal',         icon: Flag },
    { pct: 50,  label: 'Setengah Misi',       icon: Star },
    { pct: 75,  label: 'Penjelajah Tangguh',  icon: Sparkles },
    { pct: 100, label: 'Pulau Ditaklukkan',   icon: Crown },
  ];

  return (
    <div className="w-full space-y-3.5">
      {/* Top row: counter + percentage */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-300">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] shadow-sm">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>{completedCount}</span> / <span>{totalCount}</span> Topik Selesai
          </span>
          {isComplete && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
              <CheckCircle2 className="w-3 h-3" /> Ekspedisi Tuntas!
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Kemajuan</span>
          <span className="text-2xl font-black font-mono tabular-nums text-cyan-300">
            {targetPct}%
          </span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="relative">
        <div className="relative h-4 sm:h-5 rounded-full bg-slate-900/90 border border-cyan-500/30 overflow-hidden shadow-inner shadow-cyan-950/80 p-0.5">
          <div
            className={`h-full rounded-full transition-[width] duration-700 ease-out ${
              isComplete || targetPct >= 100
                ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-300'
                : 'bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-400'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, targetPct))}%` }}
          />
        </div>

        {/* Milestone Checkpoint Pins */}
        <div className="absolute inset-x-0 -bottom-5 flex justify-between px-1 pointer-events-none">
          {milestones.map((m) => {
            const reached = targetPct >= m.pct;
            const Icon = m.icon;
            return (
              <div key={m.pct} className="flex flex-col items-center">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] border transition-all duration-300 ${
                  reached
                    ? 'bg-emerald-400 text-slate-950 border-white scale-110'
                    : 'bg-slate-800 text-slate-500 border-slate-700'
                }`}>
                  <Icon className="w-2.5 h-2.5" />
                </div>
                <span className={`text-[9px] font-mono mt-0.5 tracking-tight ${
                  reached ? 'text-cyan-300 font-extrabold' : 'text-slate-600'
                }`}>
                  {m.pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="h-2" />
    </div>
  );
}
