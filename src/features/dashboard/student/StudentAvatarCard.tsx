'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { CyberFantasyAvatar } from '@/components/avatar/CyberFantasyAvatar';
const CosmeticShopModal = dynamic(() => import('@/features/pet/components/CosmeticShopModal').then((module) => module.CosmeticShopModal), { ssr: false });
import { calculateLevel } from '@/features/pet/lib/levelCalc';
import { getAdventurerTitle } from '@/features/dashboard/student/adventurerTitle';
import type { StudentGamificationData } from '@/features/pet/lib/petQueries';
import { Award, BookOpen, ShoppingBag, Sparkles } from 'lucide-react';

export function StudentAvatarCard({
  fullName,
  totalXp,
  coins,
  inventory,
  equippedCosmetics,
}: StudentGamificationData) {
  const [isWardrobeOpen, setIsWardrobeOpen] = useState(false);
  const level = calculateLevel(totalXp);
  const adventurer = getAdventurerTitle(level.currentLevel);
  const cosmetics = equippedCosmetics ?? {};

  return (
    <>
      <section aria-label={`Avatar petualang ${fullName}`} className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0 rounded-3xl border border-blue-200 bg-gradient-to-br from-sky-50 via-indigo-50 to-purple-100 p-3 shadow-inner dark:border-purple-500/30 dark:from-slate-800 dark:via-indigo-950/60 dark:to-purple-950/50">
            <CyberFantasyAvatar
              archetype={cosmetics.archetype || 'astral-knight'}
              skinTone={cosmetics.skinTone || 'default'}
              hatId={cosmetics.hatId ?? undefined}
              outfitId={cosmetics.outfitId || 'outfit-cyber-hoodie'}
              auraId={cosmetics.auraId || undefined}
              size="xl"
              animateIdle
            />
            <span className="absolute -right-2 -top-2 rounded-full border-2 border-white bg-indigo-600 px-2 py-1 text-[10px] font-black text-white shadow dark:border-slate-900">
              Lv {level.currentLevel}
            </span>
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-white">{fullName}</p>
              <p className="text-xs font-semibold text-indigo-600 dark:text-purple-300">{adventurer.title}</p>
              <p className="mt-1 text-[11px] capitalize text-slate-500 dark:text-slate-400">
                {cosmetics.archetype ? cosmetics.archetype.replace(/-/g, ' ') : 'Astral Knight'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                <Sparkles className="h-3 w-3" /> {coins.toLocaleString('id-ID')} koin
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Award className="h-3 w-3" /> {totalXp.toLocaleString('id-ID')} EXP
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            <span>Progres ke Level {level.currentLevel + 1}</span>
            <span>{level.xpInCurrentLevel} / {level.xpNeededThisLevel} EXP</span>
          </div>
          <div
            role="progressbar"
            aria-label={`Progres level ${level.currentLevel}`}
            aria-valuenow={level.progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 transition-[width] duration-500"
              style={{ width: `${level.progressPercent}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setIsWardrobeOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
          >
            <ShoppingBag className="h-3.5 w-3.5" /> Ubah Avatar
          </button>
          <Link
            href="/student/lessons"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <BookOpen className="h-3.5 w-3.5" /> Mulai Quest
          </Link>
        </div>
      </section>

      {isWardrobeOpen && (
        <CosmeticShopModal
          studentName={fullName}
          coins={coins}
          totalXp={totalXp}
          inventory={inventory ?? []}
          equippedCosmetics={equippedCosmetics}
          onClose={() => setIsWardrobeOpen(false)}
        />
      )}
    </>
  );
}
