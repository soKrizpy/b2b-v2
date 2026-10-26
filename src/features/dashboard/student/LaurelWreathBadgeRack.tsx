'use client';
// src/features/dashboard/student/LaurelWreathBadgeRack.tsx
// Golden Laurel Wreath Badge Showcase for student achievements.
// Transferred from Quest Map to the dedicated "Lencana & Target" tab.
// Synchronized with student topic completion progress & module certificates.

import { Trophy, Sparkles, Lock, ShieldCheck } from 'lucide-react';

export interface LaurelBadge {
  id: string;
  name: string;
  desc: string;
  icon: string;
  laurelColor: string;
  glow: string;
  minCompleted: number;
  requiresCert?: boolean;
  requiresAllTopics?: boolean;
}

export const LAUREL_BADGES: LaurelBadge[] = [
  {
    id: 'first-prog',
    name: 'First Program',
    desc: 'Menuntaskan topik materi pertama di kurikulum',
    icon: '🐍',
    laurelColor: 'text-emerald-400 border-emerald-500/50 bg-emerald-950/60',
    glow: 'shadow-emerald-500/30',
    minCompleted: 1,
  },
  {
    id: 'loop-master',
    name: 'Loop Master',
    desc: 'Menguasai perulangan aksi berulang dan pola kode',
    icon: '🔄',
    laurelColor: 'text-amber-400 border-amber-500/50 bg-amber-950/60',
    glow: 'shadow-amber-500/30',
    minCompleted: 3,
  },
  {
    id: 'logic-hero',
    name: 'Logic Hero',
    desc: 'Menaklukkan teka-teki percabangan & sensor logika',
    icon: '⚙️',
    laurelColor: 'text-purple-400 border-purple-500/50 bg-purple-950/60',
    glow: 'shadow-purple-500/30',
    minCompleted: 5,
  },
  {
    id: 'func-wizard',
    name: 'Function Wizard',
    desc: 'Menyusun fungsi terstruktur dan modular tanpa cela',
    icon: '🧊',
    laurelColor: 'text-sky-400 border-sky-500/50 bg-sky-950/60',
    glow: 'shadow-sky-500/30',
    minCompleted: 8,
  },
  {
    id: 'bug-hunter',
    name: 'Bug Hunter',
    desc: 'Menemukan dan memperbaiki kesalahan kode program',
    icon: '🐞',
    laurelColor: 'text-rose-400 border-rose-500/50 bg-rose-950/60',
    glow: 'shadow-rose-500/30',
    minCompleted: 10,
  },
  {
    id: 'grandmaster',
    name: 'Code Master',
    desc: 'Menuntaskan 12 topik dan memperoleh setidaknya satu sertifikat kelulusan.',
    icon: '👑',
    laurelColor: 'text-yellow-400 border-yellow-500/60 bg-yellow-950/70',
    glow: 'shadow-yellow-500/40',
    minCompleted: 12,
    requiresCert: true,
  },
  {
    id: 'curriculum-guardian',
    name: 'Penjaga Kurikulum',
    desc: 'Menuntaskan semua topik kurikulum dan memiliki sertifikat kelulusan.',
    icon: '🗝️',
    laurelColor: 'text-cyan-300 border-cyan-400/60 bg-cyan-950/70',
    glow: 'shadow-cyan-500/35',
    minCompleted: 1,
    requiresCert: true,
    requiresAllTopics: true,
  },
];

interface Props {
  completedCount: number;
  certificatesCount?: number;
  totalPossibleCount?: number;
}

export function LaurelWreathBadgeRack({
  completedCount,
  certificatesCount = 0,
  totalPossibleCount = 0,
}: Props) {
  const getIsUnlocked = (b: LaurelBadge) => {
    const topicRequirementMet = b.requiresAllTopics
      ? totalPossibleCount > 0 && completedCount >= totalPossibleCount
      : completedCount >= b.minCompleted;
    const certificateRequirementMet = !b.requiresCert || certificatesCount > 0;
    return topicRequirementMet && certificateRequirementMet;
  };

  const unlockedCount = LAUREL_BADGES.filter(getIsUnlocked).length;

  return (
    <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-slate-950 via-indigo-950/70 to-slate-950 border-2 border-amber-400/50 shadow-2xl text-white flex flex-col gap-5">
      {/* Header with Title and Unlocked Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 font-mono text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-300" />
              16-BIT GOLDEN LAUREL AWARDS
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            RAK LENCANA KEHORMATAN (GOLDEN LAUREL SHOWCASE)
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Koleksi lencana daun salam emas yang diperoleh seiring penjelajahan misi dan kuis kepulauan.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="text-xs font-mono font-black text-amber-300 bg-amber-500/20 border border-amber-400/50 px-3.5 py-1.5 rounded-2xl shadow-sm flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>{unlockedCount} / {LAUREL_BADGES.length} Lencana Diperoleh</span>
          </div>
        </div>
      </div>

      {/* 6 Laurel Wreath Badges Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {LAUREL_BADGES.map((b) => {
          const isUnlocked = getIsUnlocked(b);

          return (
            <div
              key={b.id}
              className={`rounded-2xl p-4 flex flex-col items-center text-center gap-2.5 border backdrop-blur-md transition-all duration-300 select-none
                ${isUnlocked
                  ? `${b.laurelColor} shadow-xl ${b.glow} hover:scale-105 hover:-translate-y-1`
                  : 'bg-slate-900/60 border-slate-800 text-slate-500 opacity-60'
                }`}
            >
              {/* Laurel Wreath Ornament Frame */}
              <div className="relative flex items-center justify-center w-16 h-16 my-1">
                <span className="text-3xl select-none filter drop-shadow-md">
                  {b.icon}
                </span>

                {/* Outer Laurel Ring Indicator */}
                <div
                  className={`absolute inset-0 rounded-full border-2 border-dashed
                    ${isUnlocked ? 'border-amber-400/90 animate-spin-slow' : 'border-slate-700'}`}
                />
              </div>

              <div className="min-w-0 w-full">
                <h5 className={`text-xs font-black truncate ${isUnlocked ? 'text-white' : 'text-slate-400'}`}>
                  {b.name}
                </h5>
                <p className="text-[10px] text-slate-300 leading-snug mt-1 line-clamp-2">
                  {b.desc}
                </p>
              </div>

              <div className="mt-auto pt-2 w-full border-t border-white/10">
                {isUnlocked ? (
                  <span className="inline-flex items-center justify-center gap-1 text-[9.5px] font-mono font-black text-amber-300 px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 w-full">
                    <Sparkles className="w-2.5 h-2.5 text-amber-300" /> DIPEROLEH
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center gap-1 text-[9.5px] font-mono font-bold text-slate-400 px-2 py-0.5 rounded-full bg-slate-950/60 border border-slate-800 w-full">
                    <Lock className="w-2.5 h-2.5 text-slate-500" /> {b.minCompleted} Topik
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
