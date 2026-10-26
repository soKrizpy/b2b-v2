'use client';
// src/features/dashboard/student/StudentAchievementBadges.tsx
// Visual component displaying earned achievement badges and progression based on gamData.

import { useState, useMemo } from 'react';
import type { StudentGamificationData } from '@/features/pet/lib/petQueries';
import type { CertificateWithModule } from '@/features/certificates/queries';
import { calculateLevel, minXpForLevel } from '@/features/pet/lib/levelCalc';

interface Props {
  gamData: StudentGamificationData | null;
  certificates?: CertificateWithModule[];
  completedCount?: number;
  totalPossibleCount?: number;
}

export type BadgeCategory = 'all' | 'learning' | 'level' | 'coins' | 'wardrobe' | 'cert';
export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

interface BadgeDef {
  id: string;
  title: string;
  description: string;
  category: 'learning' | 'level' | 'coins' | 'wardrobe' | 'cert';
  rarity: BadgeRarity;
  icon: string;
  unlocked: boolean;
  currentValue: number;
  targetValue: number;
  unit: string;
}

const RARITY_CONFIG: Record<BadgeRarity, {
  label: string;
  border: string;
  bgUnlocked: string;
  glow: string;
  badgeTag: string;
  iconGlow: string;
}> = {
  common: {
    label: 'Common',
    border: 'border-slate-300 dark:border-slate-700',
    bgUnlocked: 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/90 dark:to-slate-800/80',
    glow: 'shadow-slate-400/20',
    badgeTag: 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    iconGlow: 'bg-slate-500/10 border-slate-400/30',
  },
  rare: {
    label: 'Rare',
    border: 'border-blue-400/50 dark:border-blue-500/50',
    bgUnlocked: 'bg-gradient-to-br from-blue-50/80 via-sky-50/40 to-indigo-50/50 dark:from-blue-950/40 dark:via-sky-950/30 dark:to-slate-900',
    glow: 'shadow-blue-500/20 shadow-lg',
    badgeTag: 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/30',
    iconGlow: 'bg-blue-500/20 border-blue-400/40 shadow-[0_0_15px_rgba(59,130,246,0.3)]',
  },
  epic: {
    label: 'Epic',
    border: 'border-purple-400/60 dark:border-purple-500/50',
    bgUnlocked: 'bg-gradient-to-br from-purple-50/80 via-fuchsia-50/40 to-slate-50 dark:from-purple-950/40 dark:via-fuchsia-950/20 dark:to-slate-900',
    glow: 'shadow-purple-500/25 shadow-lg',
    badgeTag: 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30',
    iconGlow: 'bg-purple-500/20 border-purple-400/40 shadow-[0_0_20px_rgba(168,85,247,0.35)]',
  },
  legendary: {
    label: 'Legendary',
    border: 'border-amber-400 dark:border-amber-500/70',
    bgUnlocked: 'bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-yellow-50/50 dark:from-amber-950/40 dark:via-yellow-950/20 dark:to-slate-900',
    glow: 'shadow-amber-500/30 shadow-xl',
    badgeTag: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 font-black',
    iconGlow: 'bg-gradient-to-br from-amber-400/30 to-orange-400/30 border-amber-400/50 shadow-[0_0_25px_rgba(245,158,11,0.45)]',
  },
};

export interface AchievementMilestoneInput {
  totalXp: number;
  coins: number;
  inventoryCount: number;
  hasEquippedHat: boolean;
  certificateCount: number;
  completedCount: number;
  totalPossibleCount: number;
}

export interface AchievementMilestone {
  id: string;
  title: string;
  description: string;
  kind: 'level' | 'badge' | 'certificate' | 'progress';
}

/** Share the exact unlock conditions with the dashboard's new-achievement notice. */
export function getUnlockedAchievementMilestones(input: AchievementMilestoneInput): AchievementMilestone[] {
  const level = calculateLevel(input.totalXp).currentLevel;
  const items: Array<AchievementMilestone & { unlocked: boolean }> = [
    { id: 'novice-coder', title: 'Langkah Pertama', description: 'Menyelesaikan topik materi pertamamu.', kind: 'badge', unlocked: input.completedCount >= 1 },
    { id: 'explorer', title: 'Penjelajah Kode', description: 'Mencapai Level 2 dengan mengumpulkan 100 EXP.', kind: 'badge', unlocked: level >= 2 },
    { id: 'logic-adventurer', title: 'Petualang Logika', description: 'Mencapai Level 3 dengan mengumpulkan 230 EXP.', kind: 'badge', unlocked: level >= 3 },
    { id: 'algorithm-master', title: 'Master Algoritma', description: 'Mencapai Level 5 melalui latihan konsisten.', kind: 'badge', unlocked: level >= 5 },
    { id: 'cyber-legend', title: 'Cyber Legend', description: 'Mencapai Level 10 dan menguasai perjalanan kode.', kind: 'badge', unlocked: level >= 10 },
    { id: 'topic-trail', title: 'Penjelajah Materi', description: 'Menuntaskan 3 topik pembelajaran.', kind: 'badge', unlocked: input.completedCount >= 3 },
    { id: 'topic-master', title: 'Penakluk 10 Topik', description: 'Menuntaskan 10 topik pembelajaran.', kind: 'badge', unlocked: input.completedCount >= 10 },
    { id: 'curriculum-master', title: 'Penguasa Kurikulum', description: 'Menuntaskan semua topik yang tersedia.', kind: 'badge', unlocked: input.totalPossibleCount > 0 && input.completedCount >= input.totalPossibleCount },
    { id: 'first-gold', title: 'Tabungan Koin', description: 'Mengumpulkan 20 Koin B2B.', kind: 'badge', unlocked: input.coins >= 20 },
    { id: 'coin-collector', title: 'Kolektor Koin', description: 'Mengumpulkan 50 Koin B2B.', kind: 'badge', unlocked: input.coins >= 50 },
    { id: 'coin-tycoon', title: 'Sultan B2B', description: 'Mengumpulkan 150 Koin B2B.', kind: 'badge', unlocked: input.coins >= 150 },
    { id: 'pet-stylish', title: 'Gaya Petualang', description: 'Memasang aksesori pada karakter atau pet.', kind: 'badge', unlocked: input.hasEquippedHat },
    { id: 'fashion-starter', title: 'Kolektor Kostum', description: 'Mengoleksi setidaknya 2 item.', kind: 'badge', unlocked: input.inventoryCount >= 2 },
    { id: 'certified-scholar', title: 'Lulusan Teruji', description: 'Mendapatkan sertifikat kelulusan pertamamu.', kind: 'badge', unlocked: input.certificateCount >= 1 },
    { id: 'master-graduate', title: 'Cendekia Sejati', description: 'Mengumpulkan 3 sertifikat kelulusan modul.', kind: 'badge', unlocked: input.certificateCount >= 3 },
  ];
  return items.filter((item) => item.unlocked).map(({ id, title, description, kind }) => ({ id, title, description, kind }));
}

export function StudentAchievementBadges({
  gamData,
  certificates = [],
  completedCount = 0,
  totalPossibleCount = 0,
}: Props) {
  const [filter, setFilter] = useState<BadgeCategory>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  const totalXp = gamData?.totalXp ?? 0;
  const coins = gamData?.coins ?? 0;
  const inventoryCount = gamData?.inventory?.length ?? 0;
  const hasEquippedHat = Boolean(gamData?.equippedHatId);
  const certCount = certificates.length;
  const currentLevel = calculateLevel(totalXp).currentLevel;
  const xpForLevel2 = minXpForLevel(2);
  const xpForLevel3 = minXpForLevel(3);
  const xpForLevel5 = minXpForLevel(5);
  const xpForLevel10 = minXpForLevel(10);

  const badges: BadgeDef[] = useMemo(() => {
    return [
      {
        id: 'novice-coder',
        title: 'Langkah Pertama',
        description: 'Menyelesaikan topik materi pertamamu.',
        category: 'learning',
        rarity: 'common',
        icon: '🌱',
        unlocked: completedCount >= 1,
        currentValue: Math.min(completedCount, 1),
        targetValue: 1,
        unit: 'Topik',
      },
      {
        id: 'explorer',
        title: 'Penjelajah Kode',
        description: 'Mencapai Level 2 dengan mengumpulkan 100 EXP.',
        category: 'level',
        rarity: 'common',
        icon: '🧭',
        unlocked: currentLevel >= 2,
        currentValue: Math.min(totalXp, xpForLevel2),
        targetValue: xpForLevel2,
        unit: 'XP',
      },
      {
        id: 'logic-adventurer',
        title: 'Petualang Logika',
        description: 'Mencapai Level 3 dengan mengumpulkan 230 EXP.',
        category: 'level',
        rarity: 'rare',
        icon: '⚡',
        unlocked: currentLevel >= 3,
        currentValue: Math.min(totalXp, xpForLevel3),
        targetValue: xpForLevel3,
        unit: 'XP',
      },
      {
        id: 'algorithm-master',
        title: 'Master Algoritma',
        description: 'Mencapai Level 5 melalui latihan yang konsisten.',
        category: 'level',
        rarity: 'epic',
        icon: '🔮',
        unlocked: currentLevel >= 5,
        currentValue: Math.min(totalXp, xpForLevel5),
        targetValue: xpForLevel5,
        unit: 'XP',
      },
      {
        id: 'cyber-legend',
        title: 'Cyber Legend',
        description: 'Mencapai Level 10 dan menguasai perjalanan kode.',
        category: 'level',
        rarity: 'legendary',
        icon: '👑',
        unlocked: currentLevel >= 10,
        currentValue: Math.min(totalXp, xpForLevel10),
        targetValue: xpForLevel10,
        unit: 'XP',
      },
      {
        id: 'topic-trail',
        title: 'Penjelajah Materi',
        description: 'Menuntaskan 3 topik pembelajaran.',
        category: 'learning',
        rarity: 'common',
        icon: '🗺️',
        unlocked: completedCount >= 3,
        currentValue: Math.min(completedCount, 3),
        targetValue: 3,
        unit: 'Topik',
      },
      {
        id: 'topic-master',
        title: 'Penakluk 10 Topik',
        description: 'Menuntaskan 10 topik pembelajaran.',
        category: 'learning',
        rarity: 'epic',
        icon: '🧩',
        unlocked: completedCount >= 10,
        currentValue: Math.min(completedCount, 10),
        targetValue: 10,
        unit: 'Topik',
      },
      {
        id: 'curriculum-master',
        title: 'Penguasa Kurikulum',
        description: 'Menuntaskan seluruh topik yang tersedia.',
        category: 'learning',
        rarity: 'legendary',
        icon: '🏰',
        unlocked: totalPossibleCount > 0 && completedCount >= totalPossibleCount,
        currentValue: Math.min(completedCount, totalPossibleCount),
        targetValue: totalPossibleCount,
        unit: 'Topik',
      },
      {
        id: 'first-gold',
        title: 'Tabungan Koin',
        description: 'Mengumpulkan 20 Koin B2B dari tugas dan tantangan',
        category: 'coins',
        rarity: 'common',
        icon: '🪙',
        unlocked: coins >= 20,
        currentValue: Math.min(coins, 20),
        targetValue: 20,
        unit: 'Koin',
      },
      {
        id: 'coin-collector',
        title: 'Kolektor Koin',
        description: 'Mengumpulkan 50 Koin di pundi-pundi tabungan',
        category: 'coins',
        rarity: 'rare',
        icon: '💰',
        unlocked: coins >= 50,
        currentValue: Math.min(coins, 50),
        targetValue: 50,
        unit: 'Koin',
      },
      {
        id: 'coin-tycoon',
        title: 'Sultan B2B',
        description: 'Menimbun 150+ Koin siap belanja aksesori impian',
        category: 'coins',
        rarity: 'epic',
        icon: '🏦',
        unlocked: coins >= 150,
        currentValue: Math.min(coins, 150),
        targetValue: 150,
        unit: 'Koin',
      },
      {
        id: 'pet-stylish',
        title: 'Dressed Up',
        description: 'Melengkapi aksesori kepala pada Cyber Pet kesayangan',
        category: 'wardrobe',
        rarity: 'common',
        icon: '🧢',
        unlocked: hasEquippedHat,
        currentValue: hasEquippedHat ? 1 : 0,
        targetValue: 1,
        unit: 'Aksesori Dipakai',
      },
      {
        id: 'fashion-starter',
        title: 'Kolektor Kostum',
        description: 'Memiliki 2 atau lebih item kostum di lemari avatar',
        category: 'wardrobe',
        rarity: 'rare',
        icon: '🛍️',
        unlocked: inventoryCount >= 2,
        currentValue: Math.min(inventoryCount, 2),
        targetValue: 2,
        unit: 'Item Lemari',
      },
      {
        id: 'certified-scholar',
        title: 'Lulusan Teruji',
        description: 'Mendapatkan minimal 1 sertifikat kelulusan modul',
        category: 'cert',
        rarity: 'epic',
        icon: '📜',
        unlocked: certCount >= 1,
        currentValue: Math.min(certCount, 1),
        targetValue: 1,
        unit: 'Sertifikat',
      },
      {
        id: 'master-graduate',
        title: 'Cendekia Sejati',
        description: 'Mengumpulkan 3 sertifikat kelulusan modul.',
        category: 'cert',
        rarity: 'legendary',
        icon: '🏆',
        unlocked: certCount >= 3,
        currentValue: Math.min(certCount, 3),
        targetValue: 3,
        unit: 'Sertifikat',
      },
    ];
  }, [totalXp, currentLevel, xpForLevel2, xpForLevel3, xpForLevel5, xpForLevel10, coins, inventoryCount, hasEquippedHat, certCount, completedCount, totalPossibleCount]);

  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const totalBadges = badges.length;
  const unlockPercentage = Math.round((unlockedCount / totalBadges) * 100);

  const filteredBadges = useMemo(() => {
    return badges.filter((b) => {
      if (filter !== 'all' && b.category !== filter) return false;
      if (statusFilter === 'unlocked' && !b.unlocked) return false;
      if (statusFilter === 'locked' && b.unlocked) return false;
      return true;
    });
  }, [badges, filter, statusFilter]);

  return (
    <section className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400
            flex items-center justify-center text-lg shadow-md shadow-amber-500/20 text-white">
            🏅
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Lencana Pencapaian
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full
                bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                {unlockedCount} / {totalBadges} Diraih
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Koleksi lencana prestasi saat kamu belajar dan mengembangkan Cyber Pet!
            </p>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900/90 border border-blue-200/80
          dark:border-purple-500/30 rounded-2xl px-3.5 py-2 shadow-xs min-w-[200px]">
          <div className="flex-1">
            <div className="flex justify-between items-center text-[10px] font-black mb-1">
              <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider">Progres Lencana</span>
              <span className="text-amber-600 dark:text-amber-400">{unlockPercentage}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-purple-600
                  transition-all duration-500"
                style={{ width: `${unlockPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              { id: 'all', label: 'Semua', icon: '🌟' },
              { id: 'learning', label: 'Materi', icon: '📚' },
              { id: 'level', label: 'Level & EXP', icon: '⚡' },
              { id: 'coins', label: 'Koin', icon: '🪙' },
              { id: 'wardrobe', label: 'Aksesori', icon: '🧢' },
              { id: 'cert', label: 'Sertifikat', icon: '📜' },
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-extrabold text-[11px] transition-all duration-150
                flex items-center gap-1.5 cursor-pointer ${
                filter === cat.id
                  ? 'bg-blue-600 dark:bg-purple-600 text-white shadow-sm shadow-blue-500/25 dark:shadow-purple-500/30'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-blue-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-purple-600/50'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Status Toggle (All / Unlocked / Locked) */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-black'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setStatusFilter('unlocked')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
              statusFilter === 'unlocked'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-black'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            Diraih ({unlockedCount})
          </button>
          <button
            onClick={() => setStatusFilter('locked')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
              statusFilter === 'locked'
                ? 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-xs font-black'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            Terkunci ({totalBadges - unlockedCount})
          </button>
        </div>
      </div>

      {/* ── Badges Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {filteredBadges.map((badge) => {
          const cfg = RARITY_CONFIG[badge.rarity];
          const pct = badge.targetValue === 0
            ? 100
            : Math.min(100, Math.floor((badge.currentValue / badge.targetValue) * 100));

          return (
            <div
              key={badge.id}
              className={`relative rounded-2xl p-4 border transition-all duration-200 flex flex-col justify-between ${
                badge.unlocked
                  ? `${cfg.border} ${cfg.bgUnlocked} ${cfg.glow} hover:-translate-y-1`
                  : 'border-blue-100 dark:border-purple-900/30 bg-slate-50/60 dark:bg-slate-900/40 opacity-70 hover:opacity-90'
              }`}
            >
              <div>
                {/* Top Row: Rarity tag + Status badge */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${cfg.badgeTag}`}>
                    {cfg.label}
                  </span>

                  {badge.unlocked ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25">
                      <i className="fa-solid fa-circle-check text-[10px]" />
                      Diraih
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      <i className="fa-solid fa-lock text-[9px]" />
                      Terkunci
                    </span>
                  )}
                </div>

                {/* Badge Icon & Name */}
                <div className="flex items-start gap-3 mb-2.5">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 border transition-all ${
                      badge.unlocked
                        ? `${cfg.iconGlow}`
                        : 'bg-slate-200/70 dark:bg-slate-800 border-slate-300 dark:border-slate-700 grayscale'
                    }`}
                  >
                    {badge.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className={`text-sm font-black leading-tight line-clamp-1 ${
                      badge.unlocked ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'
                    }`}>
                      {badge.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                      {badge.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress Footer */}
              <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/80">
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="font-bold text-slate-400 dark:text-slate-500">
                    {badge.unlocked ? 'Selesai' : 'Syarat Terbuka'}
                  </span>
                  <span className="font-extrabold text-slate-700 dark:text-slate-300">
                    {badge.targetValue === 0
                      ? 'Tercapai 🎉'
                      : `${badge.currentValue} / ${badge.targetValue} ${badge.unit}`}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200/70 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      badge.unlocked
                        ? 'bg-emerald-500'
                        : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
