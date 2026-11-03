'use client';
// src/app/student/lessons/SimpleTopicList.tsx
// Fallback topic list rendered when NEXT_PUBLIC_ENABLE_QUEST_MAP=false.
// Shows topic progression status without pixel-art presentation.
// The underlying questMapData (progression logic) is identical — only
// the visual presentation differs.

import Link from 'next/link';
import type { QuestMapData, NodeStatus } from '@/features/quiz/questMapQueries';

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  NodeStatus,
  { label: string; icon: string; classes: string }
> = {
  COMPLETED: {
    label: 'Selesai',
    icon: '✅',
    classes:
      'bg-emerald-50 border-emerald-300/60 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-600/40 dark:text-emerald-300',
  },
  NEEDS_QUIZ: {
    label: 'Kuis Siap',
    icon: '🔥',
    classes:
      'bg-amber-50 border-amber-300/60 text-amber-800 dark:bg-amber-900/20 dark:border-amber-600/40 dark:text-amber-300',
  },
  ACTIVE_NEXT: {
    label: 'Aktif',
    icon: '📖',
    classes:
      'bg-blue-50 border-blue-300/60 text-blue-800 dark:bg-blue-900/20 dark:border-blue-600/40 dark:text-blue-300',
  },
  LOCKED: {
    label: 'Terkunci',
    icon: '🔒',
    classes:
      'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-900/20 dark:border-slate-700/40 dark:text-slate-500',
  },
};

interface Props {
  questData: QuestMapData;
  allModules: Array<{ id: number; title: string; topicCount: number; enrollmentStatus: 'active' | 'paused' }>;
  currentModuleId: number;
  accessibleCount: number;
}

export function SimpleTopicList({ questData, allModules, currentModuleId, accessibleCount }: Props) {
  const { mod, nodes, moduleComplete, hasFinal } = questData;

  const completedCount = nodes.filter((n) => n.status === 'COMPLETED').length;
  const progressPercent =
    nodes.length > 0 ? Math.round((completedCount / nodes.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Module selector (when multiple accessible modules) */}
      {accessibleCount > 1 && (
        <div className="flex flex-wrap gap-2">
          {allModules.filter((m) => m.enrollmentStatus === 'active' || m.topicCount > 0).map((m) => (
            <Link
              key={m.id}
              href={`/student/lessons?moduleId=${m.id}`}
              className={`px-4 py-2 rounded-2xl text-xs font-extrabold border transition-all flex items-center gap-1.5
                ${m.id === currentModuleId
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                  : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-slate-400 hover:border-indigo-400'
                }`}
            >
              {m.title} ({m.topicCount})
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-0.5
                ${m.enrollmentStatus === 'active'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                }`}>
                {m.enrollmentStatus === 'active' ? 'active' : 'paused'}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Module header + progress */}
      <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-blue-400/40 dark:border-purple-500/40 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-1">
              {mod.id === currentModuleId &&
                allModules.find((m) => m.id === mod.id)?.enrollmentStatus === 'paused'
                ? '📖 Mode Review'
                : 'Modul Aktif'}
            </p>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              {mod.title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {completedCount} / {nodes.length} topik selesai
            </p>
          </div>
          {moduleComplete && (
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1.5 rounded-2xl
              bg-emerald-100 text-emerald-800 border border-emerald-300/60
              dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-600/40">
              ✅ Semua Topik Selesai
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
            <span>Progres</span>
            <span className="font-mono font-bold">{progressPercent}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Topic list */}
      <div className="flex flex-col gap-3">
        {nodes.map((node, idx) => {
          const cfg = STATUS_CONFIG[node.status];
          const canOpen = node.isUnlocked && node.status !== 'LOCKED';

          const card = (
            <div
              className={`rounded-2xl border p-4 transition-all duration-200
                ${cfg.classes}
                ${canOpen ? 'cursor-pointer hover:shadow-md hover:scale-[1.01]' : 'opacity-70 cursor-default'}
              `}
            >
              <div className="flex items-start gap-3">
                {/* Step number */}
                <div className="w-8 h-8 rounded-xl bg-white/60 dark:bg-black/20 border border-current/20
                  flex items-center justify-center text-sm font-black flex-shrink-0">
                  {idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-extrabold leading-snug truncate">
                      {node.topic.title}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider
                      px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20 border border-current/20 whitespace-nowrap">
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>

                  {node.topic.description && (
                    <p className="text-xs mt-1 opacity-75 line-clamp-1">{node.topic.description}</p>
                  )}

                  {/* Quiz indicator */}
                  {node.hasQuiz && (
                    <p className="text-[10px] mt-1.5 opacity-80 font-bold">
                      {node.status === 'NEEDS_QUIZ'
                        ? `🔥 Kuis siap — skor terbaik: ${node.bestScore}`
                        : node.status === 'COMPLETED'
                        ? `⭐ ${node.stars}/3 bintang (${node.bestScore})`
                        : '📝 Kuis tersedia setelah sesi selesai'}
                    </p>
                  )}
                </div>

                {canOpen && (
                  <div className="flex-shrink-0 text-lg" aria-hidden>›</div>
                )}
              </div>
            </div>
          );

          return canOpen ? (
            <Link key={node.topic.id} href={`/student/lessons/topic/${node.topic.id}`}>
              {card}
            </Link>
          ) : (
            <div key={node.topic.id}>{card}</div>
          );
        })}

        {/* Final assessment entry point */}
        {hasFinal && (
          <div className={`rounded-2xl border p-4 transition-all duration-200
            ${moduleComplete
              ? 'bg-amber-50 border-amber-300/60 text-amber-900 dark:bg-amber-900/20 dark:border-amber-600/40 dark:text-amber-200 cursor-pointer hover:shadow-md hover:scale-[1.01]'
              : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-900/20 dark:border-slate-700/40 dark:text-slate-500 opacity-70'
            }`}>
            {moduleComplete ? (
              <Link href={`/student/assessment/${mod.id}`} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-200/60 dark:bg-amber-900/40 flex items-center justify-center text-base flex-shrink-0">
                  🏆
                </div>
                <div>
                  <p className="text-sm font-extrabold">Ujian Akhir Modul</p>
                  <p className="text-xs opacity-75 mt-0.5">Selesaikan semua topik untuk membuka ujian ini</p>
                </div>
                <div className="ml-auto text-lg" aria-hidden>›</div>
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-200/60 dark:bg-slate-800/40 flex items-center justify-center text-base flex-shrink-0">
                  🔒
                </div>
                <div>
                  <p className="text-sm font-extrabold">Ujian Akhir Modul</p>
                  <p className="text-xs opacity-75 mt-0.5">Selesaikan semua topik untuk membuka ujian ini</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
