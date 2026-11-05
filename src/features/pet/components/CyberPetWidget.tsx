'use client';
// src/features/pet/components/CyberPetWidget.tsx
// Cyber Pet companion widget for the Student Dashboard.

import { useState } from 'react';
import { calculateLevel, getPetStatus } from '../lib/levelCalc';
import type { StudentGamificationData } from '../lib/petQueries';
import { CyberPetRenderer } from '@/components/avatar/CyberPetRenderer';
import { CosmeticShopModal } from '@/features/pet/components/CosmeticShopModal';
import { ShoppingBag, HeartPulse, Coins } from 'lucide-react';

interface CyberPetWidgetProps extends StudentGamificationData {
  justLevelledUp?: boolean;
  compact?: boolean;
}

export function CyberPetWidget({
  avatarId,
  fullName,
  totalXp,
  coins,
  inventory,
  equippedCosmetics,
  justLevelledUp = false,
  compact = false,
}: CyberPetWidgetProps) {
  const level  = calculateLevel(totalXp);
  const status = getPetStatus(level.progressPercent, justLevelledUp);

  const [isShopOpen, setIsShopOpen] = useState(false);

  const activePetId  = equippedCosmetics?.petId || avatarId || 'cat';
  const activePetHat = equippedCosmetics?.petHatId || null;

  return (
    <>
      <section
        data-pet-widget
        aria-label={`Cyber Pet untuk ${fullName}`}
        className={`flex ${compact ? 'flex-row items-center gap-4' : 'flex-col items-center gap-5'}`}
      >
        {/* ── Avatar stage ─────────────────────────────────────────── */}
        <div className={`flex flex-col items-center gap-2 ${compact ? '' : 'w-full'}`}>
          {/* Float animation via CSS */}
          <div
            className={`relative flex-shrink-0 cursor-pointer select-none ${compact ? 'w-20 h-20' : 'w-32 h-32'}`}
            style={{ animation: 'slideIn 0.4s ease both' }}
          >
            {/* Level badge */}
            <div
              data-pet-level-badge
              className="absolute -top-1.5 -right-1.5 z-10 w-7 h-7 rounded-full
                bg-blue-600 dark:bg-purple-600 text-white text-xs font-black
                flex items-center justify-center ring-2 ring-white dark:ring-zinc-900 shadow-md"
              aria-label={`Level ${level.currentLevel}`}
            >
              {level.currentLevel}
            </div>

            <div
              className="w-full h-full rounded-3xl overflow-hidden
                bg-gradient-to-br from-blue-50/80 to-indigo-100/80
                dark:from-slate-900 dark:to-purple-950/60
                border border-blue-300/40 dark:border-purple-500/40 shadow-lg p-2
                flex items-center justify-center"
            >
              <CyberPetRenderer
                petId={activePetId}
                petHatId={activePetHat}
                size={compact ? 'md' : 'xl'}
                animate={false}
              />
            </div>
          </div>

          {/* Ground shadow */}
          {!compact && (
            <div
              aria-hidden="true"
              className="w-20 h-2.5 rounded-full bg-blue-900/15 dark:bg-purple-900/35 blur-sm animate-pulse"
            />
          )}

          {/* Shop Button */}
          {!compact && (
            <button
              type="button"
              onClick={() => setIsShopOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-black
                bg-blue-500/15 hover:bg-blue-500/25 text-blue-700 dark:bg-purple-500/20 dark:hover:bg-purple-500/30 dark:text-purple-300
                border border-blue-400/30 dark:border-purple-500/30 transition-all hover:scale-105 active:scale-95 shadow-sm mt-1"
            >
              <ShoppingBag className="w-3 h-3" />
              <span>Ganti Kostum / Toko</span>
            </button>
          )}
        </div>

        {/* ── Stats ────────────────────────────────────────────────── */}
        <div
          data-pet-stats
          className={`flex flex-col gap-3 ${compact ? 'flex-1 min-w-0' : 'w-full'}`}
        >
          {/* Status message */}
          <p
            data-pet-status
            className="text-xs font-bold text-blue-700 dark:text-purple-300 text-center flex items-center justify-center gap-1.5"
            aria-live="polite"
          >
            <HeartPulse className="w-3.5 h-3.5 text-rose-500 animate-pulse" aria-hidden="true" />
            {status}
          </p>

          {/* XP bar */}
          <div data-pet-xp-bar>
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                XP Level {level.currentLevel}
              </span>
              <span aria-label={`${level.xpInCurrentLevel} dari ${level.xpNeededThisLevel} XP`}>
                {level.xpInCurrentLevel} / {level.xpNeededThisLevel}
              </span>
            </div>

            <div
              role="progressbar"
              aria-valuenow={level.progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progress ke level ${level.currentLevel + 1}: ${level.progressPercent}%`}
              className="h-2.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden"
            >
              <div
                data-pet-xp-fill
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500
                  transition-[width] duration-700 ease-out"
                style={{ width: `${level.progressPercent}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-400 mt-1 text-right">
              Total:{' '}
              <span data-pet-total-xp className="font-semibold text-slate-600 dark:text-slate-300">
                {totalXp}
              </span>{' '}
              XP
            </p>
          </div>

          {/* Coin counter */}
          <div
            data-pet-coins
            className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20
              rounded-2xl px-4 py-2 w-fit shadow-sm"
            aria-label={`${coins} koin`}
          >
            <Coins className="w-5 h-5 text-amber-400" aria-hidden="true" />
            <span
              data-pet-coin-count
              className="text-base font-black text-amber-600 dark:text-amber-300 tabular-nums"
            >
              {coins.toLocaleString('id-ID')}
            </span>
            <span className="text-xs text-amber-600/80 dark:text-amber-300/80 font-bold">Koin</span>
          </div>
        </div>
      </section>

      {/* Cosmetic Shop Modal */}
      {isShopOpen && (
        <CosmeticShopModal
          studentName={fullName}
          coins={coins}
          totalXp={totalXp}
          inventory={inventory ?? []}
          equippedCosmetics={equippedCosmetics}
          onClose={() => setIsShopOpen(false)}
        />
      )}
    </>
  );
}
