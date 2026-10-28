'use client';
// src/features/dashboard/student/modals/PeerInspectModal.tsx
// Read-only profile card shown when a student clicks a classmate's seat in Town Square Pod.
// Displays: Cyber-Fantasy Avatar, Companion Pet, equipped items, level & XP progress.

import { calculateLevel } from '@/features/pet/lib/levelCalc';
import { getAccessoryById } from '@/features/pet/lib/avatarShopCatalog';
import { CyberFantasyAvatar } from '@/components/avatar/CyberFantasyAvatar';
import { CyberPetRenderer } from '@/components/avatar/CyberPetRenderer';
import type { TownSquareSeat } from '@/features/sessions/queries';
import { Sparkles, X } from 'lucide-react';

interface Props {
  seat:    TownSquareSeat;
  onClose: () => void;
}

export function PeerInspectModal({ seat, onClose }: Props) {
  const lvl       = calculateLevel(seat.total_xp);
  const cos       = seat.equipped_cosmetics;
  const hatId     = cos?.hatId !== undefined ? cos.hatId : seat.equipped_hat_id;
  const hatItem   = getAccessoryById(hatId);
  const outfitItem= getAccessoryById(cos?.outfitId);
  const auraItem  = getAccessoryById(cos?.auraId);
  const titleItem = getAccessoryById(cos?.titleId);
  const petId     = cos?.petId || (seat.avatar_id && ['cat', 'fox', 'dragon', 'robot', 'bunny', 'owl', 'dog'].includes(seat.avatar_id) ? seat.avatar_id : 'cat');

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center overflow-y-auto overscroll-contain
        bg-black/70 backdrop-blur-md p-3 sm:p-4 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-sm max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain bg-white dark:bg-[#0B0F19] border border-blue-400/40 dark:border-purple-500/40
          rounded-3xl shadow-2xl p-5 sm:p-6 transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient Header */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-700
          dark:from-slate-950 dark:via-purple-950 dark:to-slate-900
          rounded-2xl p-5 text-white text-center relative border border-blue-400/40 dark:border-purple-500/30 shadow-lg">
          
          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="absolute top-3 right-3 w-8 h-8 rounded-xl
              bg-white/10 hover:bg-white/20 flex items-center justify-center
              text-white font-bold text-sm transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Avatar & Companion Pet Showcase */}
          <div className="flex items-center justify-center gap-3 mb-3">
            {/* Student Cyber-Fantasy Avatar */}
            <div className="p-1 rounded-2xl bg-white/20 dark:bg-black/30 backdrop-blur-sm border border-white/30 dark:border-purple-400/30">
              <CyberFantasyAvatar
                archetype={cos?.archetype || 'cyber-mage'}
                skinTone={cos?.skinTone || 'default'}
                hatId={hatId}
                outfitId={cos?.outfitId || 'outfit-cyber-hoodie'}
                auraId={cos?.auraId}
                size="lg"
                animateIdle
              />
            </div>

            {/* Classmate's Companion Pet */}
            <div className="p-1.5 rounded-2xl bg-white/15 dark:bg-black/30 backdrop-blur-sm border border-white/20 dark:border-purple-500/30 flex flex-col items-center">
              <CyberPetRenderer
                petId={petId}
                petHatId={cos?.petHatId}
                size="sm"
                animate
              />
              <span className="text-[9px] font-black uppercase tracking-wider text-cyan-200 mt-1">
                Pet
              </span>
            </div>
          </div>

          <h2 className="text-base font-black tracking-tight text-white">{seat.full_name}</h2>

          {/* Title or level */}
          <p className="text-xs text-blue-200 dark:text-purple-300 font-bold mt-0.5">
            {titleItem?.name || 'Novice Byte'}
          </p>

          {/* Level chip */}
          <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-black
            bg-white/20 text-white dark:bg-purple-500/20 dark:text-purple-200 border border-white/30 dark:border-purple-500/30 px-3 py-1 rounded-full">
            ⭐ Level {lvl.currentLevel}
          </div>
        </div>

        {/* Body Stats & Gear */}
        <div className="mt-4 space-y-3.5">

          {/* XP Progress */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-slate-500 dark:text-zinc-400">
                EXP Progress
              </span>
              <span className="font-extrabold text-blue-600 dark:text-purple-400 tabular-nums">
                {lvl.xpInCurrentLevel}/{lvl.xpNeededThisLevel} XP
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-cyan-500 dark:to-purple-500
                  transition-all duration-700"
                style={{ width: `${lvl.progressPercent}%` }}
              />
            </div>
          </div>

          {/* Equipped Gear Chips */}
          <div className="rounded-2xl bg-slate-50 dark:bg-zinc-950/60
            border border-blue-200/70 dark:border-purple-500/20 p-3.5 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Perlengkapan Terpasang
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Topi/Visor</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                  {hatItem?.name || 'Standard'}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Jubah/Outfit</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                  {outfitItem?.name || 'Hoodie'}
                </span>
              </div>
            </div>

            {auraItem && (
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                  Aura: {auraItem.name}
                </span>
              </div>
            )}
          </div>

          {/* Total XP & Status */}
          <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl
            bg-amber-500/10 border border-amber-500/20">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
              Total Prestasi
            </span>
            <span className="text-xs font-black tabular-nums text-amber-700 dark:text-amber-300">
              ⭐ {seat.total_xp.toLocaleString('id-ID')} XP
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800 text-center">
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium">
            Teman sekelas di Realm Bits2Bytes 🎮
          </p>
        </div>
      </div>
    </div>
  );
}
