'use client';
// src/features/dashboard/student/StudentModuleProgressChart.tsx
// Topic completion chart — CSS bars replacing recharts.

import { useState, useEffect, useMemo } from 'react';
import type { TopicProgressSummary, ModuleWithTopics } from '@/features/curriculum/queries';

interface Props {
  completedTopics: TopicProgressSummary[];
  allModules?: ModuleWithTopics[];
}

interface DataPoint {
  label: string;
  fullDate: string;
  completed: number;
  target: number;
  xpEarned: number;
}

export function StudentModuleProgressChart({ completedTopics, allModules = [] }: Props) {
  const [mounted, setMounted]         = useState(false);
  const [viewMode, setViewMode]       = useState<'daily' | 'weekly'>('daily');
  const [dailyTarget, setDailyTarget] = useState(2);
  const [weeklyTarget, setWeeklyTarget] = useState(6);

  useEffect(() => {
    setMounted(true);
    try {
      const d = localStorage.getItem('b2b_student_daily_target');
      if (d) setDailyTarget(Number(d) || 2);
      const w = localStorage.getItem('b2b_student_weekly_target');
      if (w) setWeeklyTarget(Number(w) || 6);
    } catch { /* ignore */ }
  }, []);

  const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  const dailyData = useMemo<DataPoint[]>(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const hits = completedTopics.filter((t) => t.completed_at?.startsWith(key));
      return {
        label: i === 6 ? 'Hari Ini' : `${DAY_NAMES[d.getDay()]} (${d.getDate()}/${d.getMonth() + 1})`,
        fullDate: key,
        completed: hits.length,
        target: dailyTarget,
        xpEarned: hits.reduce((s, t) => s + (t.xp_earned || 0), 0),
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedTopics, dailyTarget]);

  const weeklyData = useMemo<DataPoint[]>(() => {
    const now = new Date();
    return Array.from({ length: 4 }, (_, w) => {
      const end = new Date(now); end.setDate(end.getDate() - w * 7);
      const start = new Date(end); start.setDate(start.getDate() - 6);
      const hits = completedTopics.filter((t) => {
        if (!t.completed_at) return false;
        const ms = new Date(t.completed_at).getTime();
        return ms >= start.setHours(0,0,0,0) && ms <= end.setHours(23,59,59,999);
      });
      return {
        label: w === 0 ? 'Minggu Ini' : `Mg ${4 - w}`,
        fullDate: `${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`,
        completed: hits.length,
        target: weeklyTarget,
        xpEarned: hits.reduce((s, t) => s + (t.xp_earned || 0), 0),
      };
    }).reverse();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedTopics, weeklyTarget]);

  const data = viewMode === 'daily' ? dailyData : weeklyData;
  const currentTarget = viewMode === 'daily' ? dailyTarget : weeklyTarget;
  const maxVal = Math.max(...data.map((d) => Math.max(d.completed, d.target)), 1);

  const totalCompleted = data.reduce((s, d) => s + d.completed, 0);
  const totalTarget    = data.reduce((s, d) => s + d.target,    0);
  const totalXp        = data.reduce((s, d) => s + d.xpEarned,  0);
  const rate = totalTarget > 0 ? Math.min(100, Math.round((totalCompleted / totalTarget) * 100)) : 0;
  const totalEnrolled  = allModules.length;
  const totalTopics    = allModules.reduce((s, m) => s + (m.topics?.length ?? 0), 0);

  const TARGETS = viewMode === 'daily' ? [1, 2, 3, 5] : [3, 5, 8, 12];
  const setTarget = viewMode === 'daily'
    ? (v: number) => { setDailyTarget(v); try { localStorage.setItem('b2b_student_daily_target', String(v)); } catch { /* ignore */ } }
    : (v: number) => { setWeeklyTarget(v); try { localStorage.setItem('b2b_student_weekly_target', String(v)); } catch { /* ignore */ } };

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-lg shadow-md text-white">📊</div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">
              Progres Belajar &amp; Target Modul{' '}
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25">
                {viewMode === 'daily' ? 'Harian' : 'Mingguan'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Pantau penyelesaian materi topik modul.</p>
          </div>
        </div>
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60">
          {(['daily', 'weekly'] as const).map((v) => (
            <button key={v} onClick={() => setViewMode(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === v ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs font-black' : 'text-slate-500 dark:text-slate-400'
              }`}>
              {v === 'daily' ? 'Harian (7 Hari)' : 'Mingguan (4 Mg)'}
            </button>
          ))}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Topik Selesai', value: `${totalCompleted}`, sub: `/ ${totalTarget} target`, color: 'text-slate-900 dark:text-white' },
          { label: 'Capaian Target', value: `${rate}%`, sub: rate >= 100 ? 'Tercapai! 🎯' : 'Berjalan', color: rate >= 100 ? 'text-emerald-600 dark:text-emerald-400' : rate >= 60 ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-400' },
          { label: 'EXP Diperoleh',  value: `+${totalXp}`,    sub: 'EXP',    color: 'text-purple-600 dark:text-purple-400' },
          { label: 'Modul Aktif',    value: `${totalEnrolled}`, sub: `(${totalTopics} topik)`, color: 'text-slate-900 dark:text-white' },
        ].map((c) => (
          <div key={c.label} className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs">
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{c.label}</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-xl sm:text-2xl font-black ${c.color}`}>{c.value}</span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{c.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Chart card */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        {/* Target controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Target {viewMode === 'daily' ? 'Harian' : 'Mingguan'}:</span>
            {TARGETS.map((v) => (
              <button key={v} onClick={() => setTarget(v)}
                className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  (viewMode === 'daily' ? dailyTarget : weeklyTarget) === v
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}>
                {v} topik
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-purple-600 inline-block" /><span className="text-slate-600 dark:text-slate-300 font-bold">Topik Selesai</span></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-amber-500 inline-block" /><span className="text-slate-600 dark:text-slate-300 font-bold">Target ({currentTarget})</span></span>
          </div>
        </div>

        {/* CSS bar chart */}
        <div className="w-full h-64 sm:h-72">
          {!mounted ? (
            <div className="w-full h-full flex items-center justify-center bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Memuat grafik...</span>
            </div>
          ) : (
            <div className="flex items-end gap-2 h-full pb-8 relative">
              {/* Target reference line */}
              <div
                className="absolute inset-x-0 border-t-2 border-dashed border-amber-500/70 pointer-events-none"
                style={{ bottom: `${(currentTarget / maxVal) * 100}%` }}
              >
                <span className="absolute right-0 -top-4 text-[10px] font-bold text-amber-500">Target: {currentTarget}</span>
              </div>

              {data.map((d, i) => {
                const barH = maxVal > 0 ? (d.completed / maxVal) * 100 : 0;
                const isMet = d.completed >= d.target;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 w-44 rounded-2xl p-3 bg-white/95 dark:bg-slate-950/95 border border-slate-200 dark:border-slate-800 shadow-xl text-xs space-y-1">
                      <p className="font-black text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1 truncate">{d.label}</p>
                      <p className="flex justify-between"><span className="text-slate-500">Selesai:</span><span className="font-extrabold text-purple-600 dark:text-purple-400">{d.completed} topik</span></p>
                      <p className="flex justify-between"><span className="text-slate-500">Target:</span><span className="font-bold">{d.target}</span></p>
                      {d.xpEarned > 0 && <p className="flex justify-between"><span className="text-slate-500">EXP:</span><span className="font-bold text-amber-500">+{d.xpEarned}</span></p>}
                      {isMet && <p className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">✓ Target Tercapai</p>}
                    </div>

                    {/* Bar */}
                    <div
                      className={`w-full rounded-t-lg transition-all duration-700 ease-out ${isMet ? 'bg-purple-600' : 'bg-indigo-500'} ${d.completed === 0 ? 'opacity-30' : ''}`}
                      style={{ height: `${barH}%`, minHeight: d.completed > 0 ? '4px' : '0' }}
                    />
                    {/* Label */}
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate max-w-full text-center px-0.5">
                      {d.label.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
