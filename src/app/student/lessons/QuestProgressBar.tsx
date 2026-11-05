'use client';
// src/app/student/lessons/QuestProgressBar.tsx
// Quest Map progress bar — CSS-only animation (no motion/react, no canvas-confetti).

import { useState } from 'react';
import { Sparkles, Trophy, Flame, CheckCircle2 } from 'lucide-react';

export interface QuestProgressBarProps {
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
  topics?: Array<{ id?: number; title: string; status: string }>;
  variant?: 'banner' | 'map-hud';
  className?: string;
}

export function QuestProgressBar({
  completedCount,
  totalCount,
  isComplete,
  topics = [],
  variant = 'banner',
  className = '',
}: QuestProgressBarProps) {
  const targetPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);
  const isMapHud = variant === 'map-hud';

  return (
    <div className={`relative flex flex-col gap-2.5 w-full select-none ${className}`}>
      {/* ── Top Metric Header ── */}
      <div className="flex items-center justify-between gap-3 text-xs flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] font-bold">
            <span>Ekspedisi:</span>
            <span className="text-white font-extrabold">{completedCount}/{totalCount} Topik</span>
          </div>

          {isComplete ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-black text-[10px] uppercase tracking-wider">
              <Trophy className="w-3 h-3 text-amber-400" /> Modul Ditaklukkan!
            </span>
          ) : completedCount > 0 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 font-extrabold text-[10px] uppercase tracking-wide">
              <Flame className="w-3 h-3 text-amber-400" /> Misi Berlanjut
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 font-semibold text-[10px]">
              <Sparkles className="w-3 h-3 text-blue-400" /> Siap Menjelajah
            </span>
          )}
        </div>

        {/* Percentage Badge */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Progres</span>
          <span className={`font-black font-mono tabular-nums px-2.5 py-0.5 rounded-lg border text-sm sm:text-base ${
            isComplete
              ? 'bg-emerald-950/80 border-emerald-400/50 text-emerald-300'
              : 'bg-slate-900/80 border-cyan-500/40 text-cyan-300'
          }`}>
            {targetPct}%
          </span>
        </div>
      </div>

      {/* ── Progress Track ── */}
      <div className={`relative w-full rounded-full p-[3px] bg-slate-950/80 border border-white/15 shadow-inner shadow-black/60 ${isMapHud ? 'h-5' : 'h-6'}`}>
        <div className="relative h-full w-full rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] duration-700 ease-out ${
              isComplete || targetPct >= 100
                ? 'bg-gradient-to-r from-teal-500 via-emerald-400 to-green-300'
                : 'bg-gradient-to-r from-blue-600 via-cyan-400 to-teal-300'
            }`}
            style={{ width: `${Math.max(0, Math.min(100, targetPct))}%` }}
          />
        </div>
      </div>

      {/* ── Milestone Waypoints ── */}
      {totalCount > 1 && (
        <div className="flex gap-1 flex-wrap">
          {topics.slice(0, totalCount).map((topic, idx) => {
            const nodeNum = idx + 1;
            const isPast    = nodeNum <= completedCount;
            const isCurrent = nodeNum === completedCount + 1;

            return (
              <div
                key={idx}
                className="relative"
                onMouseEnter={() => setActiveTooltip(idx)}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                <div className={`w-2.5 h-2.5 rounded-full border transition-all duration-300 ${
                  isPast
                    ? 'bg-emerald-400 border-white scale-110'
                    : isCurrent
                    ? 'bg-cyan-400 border-white scale-125 ring-2 ring-cyan-400/60 animate-pulse'
                    : 'bg-slate-800/80 border-white/20'
                }`} />
                {activeTooltip === idx && topic && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 rounded-xl bg-slate-900/95 border border-cyan-500/40 p-2 text-white shadow-xl z-30 pointer-events-none">
                    <p className="text-[10px] font-black text-cyan-400 uppercase mb-0.5">#{nodeNum}</p>
                    <p className="text-xs font-bold leading-tight line-clamp-2">{topic.title}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Footnote ── */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 font-medium">
        <span>
          {isComplete ? (
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Seluruh tantangan pulau telah dikuasai!
            </span>
          ) : completedCount === 0 ? (
            <span>Mulai petualangan di lokasi pertama untuk mengisi progres ekspedisi.</span>
          ) : (
            <span>Tersisa <strong className="text-cyan-300">{totalCount - completedCount} lokasi</strong> menuju Ujian Akhir.</span>
          )}
        </span>
        <span className="text-[10px] font-mono text-slate-500">Target: 100%</span>
      </div>
    </div>
  );
}
