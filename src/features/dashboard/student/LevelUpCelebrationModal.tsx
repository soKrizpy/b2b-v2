'use client';
// src/features/dashboard/student/LevelUpCelebrationModal.tsx
// RPG level-up celebration modal — no external animation libraries.

import { useEffect } from 'react';
import { Coins, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  level: number;
  totalXp: number;
  coins: number;
  studentName?: string;
}

// ── RPG Adventurer Titles ──────────────────────────────────────────────────────
export function getAdventurerTitle(lvl: number): { title: string; subtitle: string; icon: string } {
  if (lvl >= 10) return { title: 'Archmage Cyber Realm',    subtitle: 'Penguasa Tertinggi Arsitektur Kode',           icon: '👑' };
  if (lvl >= 7)  return { title: 'Master Rune Komputasi',   subtitle: 'Ahli Logika & Pemecah Masalah Kompleks',       icon: '🔮' };
  if (lvl >= 5)  return { title: 'Pendekar Logika Biner',   subtitle: 'Pemberani Algoritma & Petualang Hebat',        icon: '⚔️' };
  if (lvl >= 3)  return { title: 'Penjelajah Algoritma',    subtitle: 'Penjelajah Pulau Logika & Loop Misterius',     icon: '🧭' };
  return            { title: 'Pemula Pengembara Kode',   subtitle: 'Langkah Pertama Menembus Gerbang Bits2Bytes', icon: '🌱' };
}

// ── Web Audio Victory Fanfare (zero dependencies) ─────────────────────────────
function playVictoryFanfare() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const notes = [523.25, 659.25, 783.99, 1046.50];
    const start = ctx.currentTime;
    notes.forEach((freq, idx) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === notes.length - 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, start + idx * 0.12);
      const t = start + idx * 0.12;
      const dur = idx === notes.length - 1 ? 0.6 : 0.25;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.2, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur);
    });
  } catch {
    // Audio context restricted
  }
}

export function LevelUpCelebrationModal({
  isOpen,
  onClose,
  level,
  totalXp,
  coins,
  studentName = 'Petualang',
}: Props) {
  const { title, subtitle, icon } = getAdventurerTitle(level);

  useEffect(() => {
    if (isOpen) playVictoryFanfare();
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="levelup-title"
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/85 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg rounded-3xl overflow-hidden
        bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950
        border border-amber-500/40 shadow-2xl shadow-amber-500/20
        p-7 sm:p-9 text-center text-white z-10 animate-slide-in">

        {/* Ambient orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -left-20 w-56 h-56 rounded-full bg-amber-500/15 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-56 h-56 rounded-full bg-cyan-500/15 blur-3xl" />
        </div>

        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700
            text-slate-400 hover:text-white flex items-center justify-center transition-colors
            border border-slate-700/60 text-sm font-bold"
        >
          ✕
        </button>

        {/* Level crest */}
        <div className="relative inline-flex items-center justify-center mb-4">
          <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-300 opacity-70 blur-md animate-pulse" />
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-600 p-1 shadow-xl ring-4 ring-amber-300/30 flex items-center justify-center">
            <div className="w-full h-full rounded-[22px] bg-slate-950 flex flex-col items-center justify-center">
              <span className="text-3xl sm:text-4xl select-none">{icon}</span>
              <span className="text-[11px] font-black tracking-widest text-amber-400 uppercase mt-0.5">LVL {level}</span>
            </div>
          </div>
          <span className="absolute -bottom-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-[11px] uppercase tracking-wider px-3.5 py-0.5 rounded-full shadow-md font-mono">
            ★ TINGKAT BARU ★
          </span>
        </div>

        {/* Text */}
        <div className="space-y-1.5 mb-6">
          <p className="text-xs font-black tracking-widest uppercase text-amber-400 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> SELEBRASI PETUALANGAN
          </p>
          <h2 id="levelup-title" className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Level Up, {studentName}! 🎉
          </h2>
          <p className="text-sm font-bold text-amber-200">{title}</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">{subtitle}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: '✨', value: `+${level * 25} XP`,    label: 'Bonus EXP' },
            { icon: '🪙', value: `+${level * 10} Koin`,  label: 'Loot Koin' },
            { icon: '⚡', value: '100%',                  label: 'Energi Pet' },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-slate-800/70 border border-amber-500/30 p-3 flex flex-col items-center">
              <span className="text-lg mb-1">{s.icon}</span>
              <span className="text-xs font-black text-white tabular-nums">{s.value}</span>
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Summary row */}
        <div className="rounded-2xl bg-slate-950/70 border border-slate-800 px-4 py-2.5 mb-6 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>Koin: <strong className="text-amber-400 tabular-nums">{coins.toLocaleString('id-ID')} 🪙</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>EXP: <strong className="text-purple-400 tabular-nums">{totalXp.toLocaleString('id-ID')} ✨</strong></span>
          </div>
        </div>

        {/* Actions */}
        <button
          type="button"
          onClick={onClose}
          className="w-full px-5 py-3 rounded-2xl text-xs font-black text-slate-950
            bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400
            hover:from-amber-300 hover:to-yellow-300 shadow-lg shadow-amber-500/30
            hover:-translate-y-0.5 active:scale-95 transition-all"
        >
          Klaim Hadiah &amp; Lanjut Petualangan! →
        </button>
      </div>
    </div>
  );
}
