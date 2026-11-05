'use client';
// src/features/dashboard/student/TownSquarePod.tsx
// Balanced 2x2 Town Square Pod with high-contrast avatars, countdown entry gate, and precise cursor ergonomics.
//
// Features:
//   - Teacher podium centered on top
//   - 4 Student seats arranged in a balanced 2 columns x 2 rows grid (larger size="lg" avatars)
//   - Self seat: Opens CosmeticShopModal (cursor-pointer)
//   - Peer seat: Opens PeerInspectModal (cursor-pointer)
//   - Empty seat: Dashed slot (cursor-default)
//   - Card container: cursor-default (standard mouse pointer)
//   - Countdown Gate: Counts down to start time; unlocks 5 minutes before start (and remains active during class)

import { useState, useEffect } from 'react';
import type { TownSquareMeeting, TownSquareSeat } from '@/features/sessions/queries';
import type { StudentGamificationData } from '@/features/pet/lib/petQueries';
import { CosmeticShopModal } from '@/features/pet/components/CosmeticShopModal';
import { PeerInspectModal } from '@/features/dashboard/student/modals/PeerInspectModal';
import { CyberFantasyAvatar } from '@/components/avatar/CyberFantasyAvatar';
import { LiveStatusIndicator } from '@/components/common/LiveStatusIndicator';
import {
  Crown, GraduationCap, Plus, Landmark, Video, CalendarX,
  DoorOpen, Clock, CheckCircle2, Check, Lock, Users, TriangleAlert,
} from 'lucide-react';

interface Props {
  meeting:      TownSquareMeeting | null;
  nextMeeting?: TownSquareMeeting | null;
  /** Gamification data for the current student — drives wardrobe modal */
  gamData?:     StudentGamificationData | null;
  /** Supabase auth id of the logged-in student (to identify self seat) */
  currentStudentId?: string | null;
}

const CLASS_DURATION_MINUTES = 60;

// ── Time & Countdown Formatting Helpers ─────────────────────────────────────

function formatDetailedCountdown(seconds: number): string {
  if (seconds <= 0) return '00:00:00';
  const days = Math.floor(seconds / 86400);
  const hrs  = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) {
    return `${days}h ${String(hrs).padStart(2, '0')}j ${String(mins).padStart(2, '0')}m`;
  }
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ── Avatar circle ─────────────────────────────────────────────────────────────

function AvatarCircle({
  seat,
  size = 'lg',
}: {
  seat: TownSquareSeat;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const cos = seat.equipped_cosmetics;
  const ring = seat.is_self
    ? 'ring-2 ring-cyan-400 shadow-xl shadow-cyan-500/30'
    : 'ring-1 ring-blue-200/80 dark:ring-zinc-800 group-hover:ring-blue-400/60 dark:group-hover:ring-purple-500/60 shadow-md';

  // Online status: self is online, or seat.is_online if specified
  const isOnline = seat.is_online ?? seat.is_self;

  return (
    <div className={`relative rounded-3xl ${ring} transition-all p-1 bg-white/40 dark:bg-zinc-900/60 backdrop-blur-xs`}>
      {seat.is_self && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-wider
          bg-cyan-500 text-white px-2 py-0.5 rounded-full shadow-md z-20 pointer-events-none">
          YOU
        </span>
      )}
      <CyberFantasyAvatar
        archetype={cos?.archetype || 'cyber-mage'}
        skinTone={cos?.skinTone || 'default'}
        hatId={cos?.hatId !== undefined ? cos.hatId : seat.equipped_hat_id}
        outfitId={cos?.outfitId || 'outfit-cyber-hoodie'}
        auraId={cos?.auraId}
        size={size}
        animateIdle
      />
      {/* Active/Offline student indicator dot */}
      {isOnline ? (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 z-20" title="Online">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 ring-2 ring-white dark:ring-zinc-900 shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse" />
        </span>
      ) : (
        <span
          className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-zinc-400 dark:bg-zinc-600 ring-2 ring-white dark:ring-zinc-900 z-20"
          title="Offline"
        />
      )}
    </div>
  );
}

// ── Teacher podium ────────────────────────────────────────────────────────────

function TeacherSeat({ name }: { name: string | null }) {
  return (
    <div className="flex flex-col items-center gap-1.5 cursor-default select-none">
      <div className="relative group">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600
          flex items-center justify-center text-3xl shadow-xl shadow-amber-500/20
          ring-2 ring-amber-300/50 dark:ring-amber-400/30 transition-transform group-hover:scale-105">
          👨‍🏫
        </div>
        {/* Crown Icon */}
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-base select-none drop-shadow-md">
          <Crown className="w-4 h-4 text-amber-300" />
        </span>
      </div>
      <div className="text-center">
        <p className="text-xs font-black text-amber-700 dark:text-amber-300">
          {name ?? 'Guru'}
        </p>
        <span className="text-[9px] font-extrabold uppercase tracking-wider
          bg-amber-500/10 text-amber-600 dark:text-amber-300
          px-2.5 py-0.5 rounded-full border border-amber-500/25 inline-flex items-center gap-1">
          <GraduationCap className="w-3 h-3" /> Pengajar
        </span>
      </div>
    </div>
  );
}

// ── Student seat slot (Enlarged & Balanced 2x2 Layout) ────────────────────────

function StudentSeat({
  seat,
  onClick,
}: {
  seat:    TownSquareSeat | null;
  onClick?: () => void;
}) {
  if (!seat) {
    return (
      <div className="flex flex-col items-center gap-2 opacity-50 cursor-default select-none">
        <div className="w-16 h-16 rounded-3xl border-2 border-dashed border-blue-200/80
          dark:border-zinc-700/80 flex items-center justify-center text-slate-400
          dark:text-zinc-500 text-base font-bold bg-slate-50/40 dark:bg-zinc-950/40 shadow-inner">
          <Plus className="w-3 h-3" />
        </div>
        <p className="text-[11px] text-slate-400 dark:text-zinc-500 font-bold">
          Kosong
        </p>
      </div>
    );
  }

  const firstName = seat.full_name.split(' ')[0];
  return (
    <button
      type="button"
      onClick={onClick}
      title={seat.is_self ? 'Buka Toko & Lemari Kosmetik' : `Lihat Profil & Pet ${firstName}`}
      className={`flex flex-col items-center gap-2 group relative
        focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-purple-400 rounded-3xl p-1
        ${seat.is_self ? 'cursor-pointer hover:scale-105 transition-transform' : onClick ? 'cursor-pointer hover:scale-105 transition-transform' : 'cursor-default'}`}
    >
      <div className="relative">
        <AvatarCircle seat={seat} size="lg" />
        {!seat.is_self && (
          <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 text-[9px] font-black
            bg-blue-600/90 dark:bg-purple-600/90 text-white px-2 py-0.5 rounded-full whitespace-nowrap
            opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md z-30 pointer-events-none">
            Lihat Profil
          </span>
        )}
      </div>
      <p className={`text-xs font-black truncate max-w-[85px] text-center
        group-hover:text-blue-600 dark:group-hover:text-purple-300 transition-colors
        ${seat.is_self
          ? 'text-cyan-600 dark:text-cyan-300'
          : 'text-slate-700 dark:text-slate-300'
        }`}>
        {firstName}
      </p>
    </button>
  );
}

// ── Empty State when there is truly no scheduled meeting ─────────────────────

function StateA_EmptyState() {
  return (
    <div className="rounded-3xl bg-white dark:bg-zinc-900/80
      border border-blue-400/40 dark:border-purple-500/40 shadow-sm p-5
      flex items-center justify-between gap-4 cursor-default">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20
          flex items-center justify-center text-2xl flex-shrink-0 select-none">
          🚀
        </div>
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5 mb-0.5">
            <Landmark className="w-3 h-3" /> Town Square Pod
          </span>
          <h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
            Tidak ada kelas live hari ini — Lanjutkan petualanganmu! 🎮
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Gurumu akan menjadwalkan kelas berikutnya. Nikmati quest belajarmu!
          </p>
        </div>
      </div>

        <button disabled className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold
          bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500
          border border-slate-200 dark:border-zinc-700/60 cursor-not-allowed opacity-75 flex-shrink-0">
          <CalendarX className="w-3.5 h-3.5" />
          <span>Tidak Ada Jadwal</span>
        </button>
    </div>
  );
}

// ── Main Town Square Pod Export ──────────────────────────────────────────────

export function TownSquarePod({ meeting, nextMeeting, gamData }: Props) {
  const [isMounted, setIsMounted] = useState(false);
  const [nowMs, setNowMs] = useState<number>(0);

  // Modal states — client-only
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [peerSeat,     setPeerSeat]     = useState<TownSquareSeat | null>(null);

  useEffect(() => {
    setIsMounted(true);
    setNowMs(Date.now());
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeMeeting = meeting ?? nextMeeting ?? null;

  // Truly no meeting in database
  if (!activeMeeting) {
    return <StateA_EmptyState />;
  }

  // ── Precise Schedule & Countdown Gate Calculation ─────────────────────────
  const startMs = new Date(activeMeeting.meeting_date).getTime();
  const endMs   = startMs + CLASS_DURATION_MINUTES * 60 * 1000;

  const currentNow = isMounted ? nowMs : 0;
  const secondsToStart = Math.max(0, Math.floor((startMs - currentNow) / 1000));

  const isLive = isMounted && currentNow >= startMs && currentNow <= endMs;
  const isFinished = isMounted && currentNow > endMs;
  const isUpcoming = !isMounted || currentNow < startMs;

  // Unlocked: 5 minutes (300 seconds) before start OR during the live class
  const isGateUnlocked = isMounted && ((isUpcoming && secondsToStart <= 300) || isLive);

  const displayCountdown = isMounted ? formatDetailedCountdown(secondsToStart) : '--:--:--';

  const slots: (TownSquareSeat | null)[] = [
    ...activeMeeting.seats.slice(0, 4),
    ...Array<null>(Math.max(0, 4 - activeMeeting.seats.length)).fill(null),
  ];

  const sessionLabel =
    activeMeeting.session_count > 1
      ? `Sesi ${activeMeeting.session_number}/${activeMeeting.session_count} · `
      : '';

  const hasLink = Boolean(activeMeeting.link_url);

  return (
    <>
      <div className="h-full rounded-3xl bg-white dark:bg-zinc-900/80
        border border-blue-400/40 dark:border-purple-500/40 shadow-sm
        shadow-[0_0_30px_rgba(59,130,246,0.08)] dark:shadow-[0_0_30px_rgba(168,85,247,0.15)]
        cursor-default flex flex-col justify-between overflow-hidden">

        {/* ── Pod Header ── */}
        <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900
          border-b border-blue-900/40 dark:border-purple-900/40 px-5 py-4 text-white">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-cyan-400 mb-0.5 flex items-center gap-1.5">
                <Landmark className="w-3 h-3" /> Town Square Pod
              </p>
              <h3 className="font-extrabold text-sm leading-tight truncate">
                {sessionLabel}{activeMeeting.title}
              </h3>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {isMounted && <LiveStatusIndicator isLive={isLive} />}

              {isMounted && isLive && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black
                  text-white bg-rose-600 px-2.5 py-1 rounded-full shadow-md shadow-rose-500/30">
                  <Video className="w-3 h-3 text-white animate-pulse" /> LIVE NOW
                </span>
              )}

              {isMounted && isUpcoming && !isLive && (
                <span
                  suppressHydrationWarning
                  className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border ${
                    isGateUnlocked
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-blue-500/10 dark:bg-purple-500/20 text-blue-600 dark:text-purple-300 border-blue-500/25 dark:border-purple-500/30'
                  }`}
                >
                  {isGateUnlocked ? <DoorOpen className="w-3 h-3 text-emerald-400" /> : <Clock className="w-3 h-3 text-blue-500 dark:text-purple-400" />}
                  {isGateUnlocked ? `PINTU BUKA (${displayCountdown})` : displayCountdown}
                </span>
              )}

              {isMounted && isFinished && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold
                  text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> SELESAI
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Virtual Table & Seats (Centered Teacher + Balanced 2x2 Student Grid) ── */}
        <div className="px-5 pt-4 pb-3 flex-1 flex flex-col justify-center">

          {/* Teacher podium */}
          <div className="flex justify-center mb-3.5">
            <TeacherSeat name={activeMeeting.teacher_name} />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-2 mb-3.5">
            <div className="flex-1 h-px bg-blue-100 dark:bg-purple-500/20" />
            <span className="text-[9px] font-black uppercase tracking-widest
              text-blue-600/70 dark:text-purple-300/70 whitespace-nowrap px-1 flex items-center gap-1">
              <Users className="w-3 h-3 text-blue-500 dark:text-purple-400" /> Meja Belajar
            </span>
            <div className="flex-1 h-px bg-blue-100 dark:bg-purple-500/20" />
          </div>

          {/* 4 Student Seats: Arranged in 2 columns x 2 rows for optimal balance & large avatars */}
          <div className="grid grid-cols-2 gap-x-12 sm:gap-x-16 gap-y-3.5 max-w-[260px] sm:max-w-[300px] mx-auto justify-items-center">
            {slots.map((seat, i) => {
              let handleClick: (() => void) | undefined;
              if (seat) {
                if (seat.is_self) {
                  handleClick = isMounted ? () => setWardrobeOpen(true) : undefined;
                } else {
                  handleClick = isMounted ? () => setPeerSeat(seat) : undefined;
                }
              }
              return (
                <StudentSeat
                  key={seat?.student_id ?? `empty-${i}`}
                  seat={seat}
                  onClick={handleClick}
                />
              );
            })}
          </div>
        </div>

        {/* ── Countdown Entry Gate: Active 5 min before start & during class ── */}
        <div className="px-5 pb-5">
          {!hasLink ? (
            <div className="mt-2 rounded-2xl bg-amber-500/10
              border border-amber-500/20 px-3.5 py-3 text-center cursor-default">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center justify-center gap-2">
                <TriangleAlert className="w-4 h-4 text-amber-500" /> Link kelas belum disematkan guru
              </p>
            </div>
          ) : isGateUnlocked ? (
            /* ── UNLOCKED ENTRY GATE: 5 Min Before Start OR During Live Class ── */
            <div className="mt-2 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10
              border border-emerald-500/40 p-3.5 text-center shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <DoorOpen className="w-3.5 h-3.5 text-emerald-500" />
                  {isLive ? 'Kelas Sedang Berlangsung!' : 'Pintu Kelas Terbuka! (Masuk Lebih Awal)'}
                </span>
                <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-300 uppercase tracking-widest bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {isLive ? 'Live Now' : `${displayCountdown}`}
                </span>
              </div>

              <a
                href={activeMeeting.link_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full mt-1 inline-flex items-center justify-center gap-2.5 py-3 rounded-2xl
                  text-xs font-black text-white shadow-xl transition-all duration-300
                  bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600
                  shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-[0.98]
                  cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <Video className="w-4 h-4 text-white animate-pulse" />
                <span>Masuk Kelas Sekarang (Zoom / GMeet)</span>
              </a>
            </div>
          ) : isUpcoming ? (
            /* ── COUNTDOWN GATE: More than 5 minutes before class ── */
            <div className="mt-2 rounded-2xl bg-slate-50 dark:bg-zinc-800/50
              border border-blue-200/80 dark:border-purple-500/20 p-3.5 text-center cursor-default">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-extrabold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500 dark:text-purple-400" />
                  Hitung Mundur Waktu Kelas Dimulai
                </span>
                <span
                  suppressHydrationWarning
                  className="font-mono font-black text-xs text-blue-600 dark:text-purple-300 bg-blue-500/10 dark:bg-purple-500/10 px-2.5 py-0.5 rounded-lg border border-blue-500/25 dark:border-purple-500/20"
                >
                  {displayCountdown}
                </span>
              </div>

              <button
                disabled
                className="w-full mt-1 py-3 rounded-2xl text-xs font-black
                  bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500
                  border border-slate-300/50 dark:border-zinc-700/60
                  cursor-not-allowed opacity-80 flex items-center justify-center gap-2"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                <span>Masuk Kelas (Aktif 5 menit sebelum mulai)</span>
              </button>
            </div>
          ) : isFinished ? (
            /* ── CLASS FINISHED STATE ── */
            <div className="mt-2 rounded-2xl bg-emerald-500/10
              border border-emerald-500/20 p-3.5 text-center cursor-default">
              <div className="flex items-center justify-center gap-2 text-xs font-bold
                text-emerald-600 dark:text-emerald-300 mb-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Kelas Hari Ini Telah Selesai</span>
              </div>
              <button
                disabled
                className="w-full mt-1 py-3 rounded-2xl text-xs font-black
                  bg-emerald-500/15 text-emerald-600 dark:text-emerald-400
                  border border-emerald-500/30 cursor-default opacity-85
                  flex items-center justify-center gap-2"
              >
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>Kelas Selesai</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Interactive Modals ── */}
      {isMounted && wardrobeOpen && gamData && (
        <CosmeticShopModal
          studentName={gamData.fullName}
          coins={gamData.coins}
          totalXp={gamData.totalXp}
          inventory={gamData.inventory ?? []}
          equippedCosmetics={gamData.equippedCosmetics}
          onClose={() => setWardrobeOpen(false)}
        />
      )}
      {isMounted && peerSeat && (
        <PeerInspectModal
          seat={peerSeat}
          onClose={() => setPeerSeat(null)}
        />
      )}
    </>
  );
}
