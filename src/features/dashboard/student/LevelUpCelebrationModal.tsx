'use client';
// src/features/dashboard/student/LevelUpCelebrationModal.tsx
// RPG fantasy level-up celebration modal with canvas confetti and harmonic Web Audio fanfare.

import { useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  level: number;
  totalXp: number;
  coins: number;
  studentName?: string;
  achievementTitle?: string;
  achievementDescription?: string;
  celebrationKind?: 'level' | 'badge' | 'certificate' | 'progress';
}

// ── RPG Adventurer Titles based on level ─────────────────────────────────────
export function getAdventurerTitle(lvl: number): { title: string; subtitle: string; icon: string } {
  if (lvl >= 10) {
    return { title: 'Archmage Cyber Realm', subtitle: 'Penguasa Tertinggi Arsitektur Kode', icon: '👑' };
  }
  if (lvl >= 7) {
    return { title: 'Master Rune Komputasi', subtitle: 'Ahli Logika & Pemecah Masalah Kompleks', icon: '🔮' };
  }
  if (lvl >= 5) {
    return { title: 'Pendekar Logika Biner', subtitle: 'Pemberani Algoritma & Petualang Hebat', icon: '⚔️' };
  }
  if (lvl >= 3) {
    return { title: 'Penjelajah Algoritma', subtitle: 'Penjelajah Pulau Logika & Loop Misterius', icon: '🧭' };
  }
  return { title: 'Pemula Pengembara Kode', subtitle: 'Langkah Pertama Menembus Gerbang Bits2Bytes', icon: '🌱' };
}

// ── Web Audio Synth Fanfare (Zero external asset latency) ─────────────────────
function playVictoryFanfare() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Melodic notes in Hz (C5, E5, G5, C6 triumphant arpeggio)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    const startTime = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = idx === notes.length - 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, startTime + idx * 0.12);

      const noteStart = startTime + idx * 0.12;
      const duration = idx === notes.length - 1 ? 0.6 : 0.25;

      gain.gain.setValueAtTime(0.001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.2, noteStart + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteStart);
      osc.stop(noteStart + duration);
    });
  } catch {
    // Audio context not allowed or unsupported in restricted environment
  }
}

// ── Fire Confetti Blast ───────────────────────────────────────────────────────
function triggerConfettiBurst() {
  const colors = ['#F59E0B', '#06B6D4', '#8B5CF6', '#10B981', '#FCD34D'];

  // Left burst
  confetti({
    particleCount: 50,
    angle: 60,
    spread: 55,
    origin: { x: 0.15, y: 0.65 },
    colors,
    zIndex: 9999,
  });

  // Right burst
  confetti({
    particleCount: 50,
    angle: 120,
    spread: 55,
    origin: { x: 0.85, y: 0.65 },
    colors,
    zIndex: 9999,
  });

  // Center star burst
  setTimeout(() => {
    confetti({
      particleCount: 70,
      spread: 90,
      origin: { x: 0.5, y: 0.45 },
      colors,
      zIndex: 9999,
    });
  }, 200);
}

export function LevelUpCelebrationModal({
  isOpen,
  onClose,
  level,
  totalXp,
  coins,
  studentName = 'Petualang',
  achievementTitle,
  achievementDescription,
  celebrationKind = 'level',
}: Props) {
  const { icon } = getAdventurerTitle(level);

  const handleCelebration = useCallback(() => {
    playVictoryFanfare();
    triggerConfettiBurst();
  }, []);

  useEffect(() => {
    if (isOpen) {
      handleCelebration();
    }
  }, [isOpen, handleCelebration]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="levelup-title"
      className="fixed inset-0 z-[120] flex items-start sm:items-center justify-center overflow-y-auto overscroll-contain p-3 sm:p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/85 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative my-auto w-full max-w-lg max-h-[calc(100dvh-1.5rem)] rounded-3xl overflow-y-auto overscroll-contain
        bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950
        border border-amber-500/40 shadow-2xl shadow-amber-500/20
        p-5 sm:p-7 text-center text-white z-10 animate-fade-in-up">

        {/* Ambient Glow Orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -left-20 w-56 h-56 rounded-full bg-amber-500/15 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-56 h-56 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-purple-500/10 blur-3xl" />
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700
            text-slate-400 hover:text-white flex items-center justify-center transition-colors
            border border-slate-700/60"
        >
          <i className="fa-solid fa-xmark text-sm" />
        </button>

        {/* Level Up Crest / Icon */}
        <div className="relative inline-flex items-center justify-center mb-4">
          {/* Outer Rotating Halo */}
          <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-300
            opacity-70 blur-md animate-pulse" />

          {/* Central Shield Badge */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl
            bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-600
            p-1 shadow-xl shadow-amber-500/40 ring-4 ring-amber-300/30 flex items-center justify-center">
            <div className="w-full h-full rounded-[22px] bg-slate-950 flex flex-col items-center justify-center">
              <span className="text-3xl sm:text-4xl select-none">{achievementTitle ? (celebrationKind === 'certificate' ? '📜' : celebrationKind === 'level' ? icon : '🏆') : '🗺️'}</span>
              <span className="text-[11px] font-black tracking-widest text-amber-400 uppercase mt-0.5">
                {achievementTitle ? (celebrationKind === 'certificate' ? 'SERTIFIKAT' : celebrationKind === 'level' ? `LVL ${level}` : 'LENCANA') : 'MISI'}
              </span>
            </div>
          </div>

          {/* Golden Level Wing */}
          <span className="absolute -bottom-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950
            font-black text-[11px] uppercase tracking-wider px-3.5 py-0.5 rounded-full shadow-md font-mono">
            {achievementTitle ? (celebrationKind === 'certificate' ? 'SERTIFIKAT DIRAIH' : celebrationKind === 'level' ? 'TINGKAT BARU' : 'LENCANA BARU') : 'MISI SELESAI'}
          </span>
        </div>

        {/* Header Text */}
        <div className="space-y-1.5 mb-6">
          <p className="text-xs font-black tracking-widest uppercase text-amber-400 flex items-center justify-center gap-1.5">
            <i className="fa-solid fa-sparkles text-amber-400" />
            {achievementTitle ? 'PENCAPAIAN BARU' : 'MISI SELESAI'}
          </p>
          <h2 id="levelup-title" className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {achievementTitle ? `Selamat, ${studentName}! 🎉` : `Misi Selesai, ${studentName}! 🎉`}
          </h2>
          <p className="text-sm font-bold text-amber-200">
            {achievementTitle ?? 'Satu langkah lagi menuju lencana berikutnya.'}
          </p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {achievementDescription ?? 'Kamu berhasil menuntaskan satu misi. Terus belajar untuk membuka pencapaian baru.'}
          </p>
        </div>

        {/* Display real achievement details instead of suggesting ungranted rewards. */}
        {achievementTitle ? (
          <div className="rounded-2xl bg-slate-800/70 border border-amber-500/30 p-4 mb-6 text-left">
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden="true">{celebrationKind === 'certificate' ? '📜' : celebrationKind === 'level' ? '🏅' : '🏆'}</span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">{celebrationKind === 'certificate' ? 'Sertifikat Diraih' : celebrationKind === 'level' ? 'Level Baru Terbuka' : 'Lencana Terbuka'}</p>
                <p className="text-sm font-bold text-white">Pencapaianmu tersimpan di galeri lencana.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-800/70 border border-cyan-500/30 p-4 mb-6 text-left">
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden="true">📚</span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-cyan-300">Progres Belajar</p>
                <p className="text-sm font-bold text-white">Teruslah berlatih dan buka lencana berikutnya.</p>
              </div>
            </div>
          </div>
        )}

        {/* Only show balances when real dashboard achievement data is supplied. */}
        {achievementTitle && (
          <div className="rounded-2xl bg-slate-950/70 border border-slate-800 px-4 py-2.5 mb-6 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-coins text-amber-400" />
              <span>Koin: <strong className="text-amber-400 tabular-nums">{coins.toLocaleString('id-ID')} 🪙</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-sparkles text-purple-400" />
              <span>Total EXP: <strong className="text-purple-400 tabular-nums">{totalXp.toLocaleString('id-ID')} ✨</strong></span>
            </div>
          </div>
        )}
        <div className="rounded-2xl bg-slate-950/70 border border-slate-800 px-4 py-2.5 mb-6
          flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-coins text-amber-400" />
            <span>Koin: <strong className="text-amber-400 tabular-nums">{coins.toLocaleString('id-ID')} 🪙</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-sparkles text-purple-400" />
            <span>Total EXP: <strong className="text-purple-400 tabular-nums">{totalXp.toLocaleString('id-ID')} ✨</strong></span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={triggerConfettiBurst}
            className="w-full sm:w-auto px-4 py-3 rounded-2xl text-xs font-extrabold text-amber-300
              bg-slate-800 hover:bg-slate-700 border border-amber-500/30 transition-all flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-wand-magic-sparkles text-amber-400" />
            Ulangi Konfeti
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:flex-1 px-5 py-3 rounded-2xl text-xs font-black text-slate-950
              bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400
              hover:from-amber-300 hover:to-yellow-300 shadow-lg shadow-amber-500/30
              hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span>Lanjut Petualangan</span>
            <i className="fa-solid fa-arrow-right text-[11px]" />
          </button>
        </div>

      </div>
    </div>
  );
}
