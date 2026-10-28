'use client';
// src/features/dashboard/student/StudentModuleProgressChart.tsx
// Interactive module & topic completion chart using Recharts for student dashboard.
// Compares daily and weekly completion rates against student targets.

import { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import type { TopicProgressSummary } from '@/features/curriculum/queries';
import type { ModuleWithTopics } from '@/features/curriculum/queries';

interface Props {
  completedTopics: TopicProgressSummary[];
  allModules?: ModuleWithTopics[];
}

interface ChartDataPoint {
  label: string;
  fullDate: string;
  completed: number;
  target: number;
  xpEarned: number;
}

export function StudentModuleProgressChart({
  completedTopics,
  allModules = [],
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [dailyTarget, setDailyTarget] = useState<number>(2);
  const [weeklyTarget, setWeeklyTarget] = useState<number>(6);

  useEffect(() => {
    setMounted(true);
    try {
      const savedDaily = localStorage.getItem('b2b_student_daily_target');
      if (savedDaily) setDailyTarget(Number(savedDaily) || 2);
      const savedWeekly = localStorage.getItem('b2b_student_weekly_target');
      if (savedWeekly) setWeeklyTarget(Number(savedWeekly) || 6);
    } catch {
      // ignore localStorage errors in sandboxed iframes
    }
  }, []);

  const handleSetDailyTarget = (val: number) => {
    setDailyTarget(val);
    try {
      localStorage.setItem('b2b_student_daily_target', String(val));
    } catch {}
  };

  const handleSetWeeklyTarget = (val: number) => {
    setWeeklyTarget(val);
    try {
      localStorage.setItem('b2b_student_weekly_target', String(val));
    } catch {}
  };

  // Build daily data for the last 7 days
  const dailyData: ChartDataPoint[] = useMemo(() => {
    const points: ChartDataPoint[] = [];
    const now = new Date();

    const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;
      const dayLabel = DAY_NAMES[d.getDay()];

      const completionsOnDay = completedTopics.filter((t) => {
        if (!t.completed_at) return false;
        return t.completed_at.startsWith(dateKey);
      });

      const count = completionsOnDay.length;
      const xp = completionsOnDay.reduce((acc, curr) => acc + (curr.xp_earned || 0), 0);

      points.push({
        label: i === 0 ? 'Hari Ini' : `${dayLabel} (${dd}/${mm})`,
        fullDate: dateKey,
        completed: count,
        target: dailyTarget,
        xpEarned: xp,
      });
    }

    return points;
  }, [completedTopics, dailyTarget]);

  // Build weekly data for the last 4 weeks
  const weeklyData: ChartDataPoint[] = useMemo(() => {
    const points: ChartDataPoint[] = [];
    const now = new Date();

    for (let w = 3; w >= 0; w--) {
      const end = new Date(now);
      end.setDate(end.getDate() - w * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);

      const startTime = start.setHours(0, 0, 0, 0);
      const endTime = end.setHours(23, 59, 59, 999);

      const completionsInWeek = completedTopics.filter((t) => {
        if (!t.completed_at) return false;
        const time = new Date(t.completed_at).getTime();
        return time >= startTime && time <= endTime;
      });

      const count = completionsInWeek.length;
      const xp = completionsInWeek.reduce((acc, curr) => acc + (curr.xp_earned || 0), 0);

      const label = w === 0 ? 'Minggu Ini' : `Mg ${4 - w}`;

      points.push({
        label,
        fullDate: `${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`,
        completed: count,
        target: weeklyTarget,
        xpEarned: xp,
      });
    }

    return points;
  }, [completedTopics, weeklyTarget]);

  const activeData = viewMode === 'daily' ? dailyData : weeklyData;
  const currentTarget = viewMode === 'daily' ? dailyTarget : weeklyTarget;

  const totalPeriodCompleted = activeData.reduce((acc, d) => acc + d.completed, 0);
  const totalPeriodTarget = activeData.reduce((acc, d) => acc + d.target, 0);
  const totalPeriodXp = activeData.reduce((acc, d) => acc + d.xpEarned, 0);
  const completionRate = totalPeriodTarget > 0
    ? Math.min(100, Math.round((totalPeriodCompleted / totalPeriodTarget) * 100))
    : 0;

  // Active module summary
  const totalEnrolledModules = allModules.length;
  const totalEnrolledTopics = allModules.reduce((acc, m) => acc + (m.topics?.length ?? 0), 0);

  return (
    <section className="space-y-4">
      {/* ── Section Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600
            flex items-center justify-center text-lg shadow-md shadow-indigo-500/20 text-white">
            📊
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Progres Belajar &amp; Target Modul
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full
                bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25">
                {viewMode === 'daily' ? 'Harian' : 'Mingguan'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pantau penyelesaian materi topik modul dan bandingkan dengan target pribadimu.
            </p>
          </div>
        </div>

        {/* View Toggle (Harian / Mingguan) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'daily'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Harian (7 Hari)
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'weekly'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              Mingguan (4 Mg)
            </button>
          </div>
        </div>
      </div>

      {/* ── Metric Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Topik Selesai
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {totalPeriodCompleted}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              / {totalPeriodTarget} target
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Capaian Target
          </p>
          <div className="flex items-baseline gap-2">
            <span className={`text-xl sm:text-2xl font-black ${
              completionRate >= 100
                ? 'text-emerald-600 dark:text-emerald-400'
                : completionRate >= 60
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}>
              {completionRate}%
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {completionRate >= 100 ? 'Tercapai! 🎯' : 'Berjalan'}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            EXP Diperoleh
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400">
              +{totalPeriodXp}
            </span>
            <span className="text-xs font-semibold text-slate-400">EXP</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Modul Aktif
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {totalEnrolledModules}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              ({totalEnrolledTopics} topik)
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Chart Card ── */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        {/* Controls row: Target customizer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Target {viewMode === 'daily' ? 'Harian' : 'Mingguan'}:
            </span>
            {viewMode === 'daily' ? (
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 5].map((val) => (
                  <button
                    key={val}
                    onClick={() => handleSetDailyTarget(val)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      dailyTarget === val
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    {val} topik
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                {[3, 5, 8, 12].map((val) => (
                  <button
                    key={val}
                    onClick={() => handleSetWeeklyTarget(val)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      weeklyTarget === val
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {val} topik
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-purple-600 inline-block" />
              <span className="text-slate-600 dark:text-slate-300 font-bold">Topik Selesai</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-amber-500 inline-block border-t border-dashed border-amber-500" />
              <span className="text-slate-600 dark:text-slate-300 font-bold">Garis Target ({currentTarget})</span>
            </div>
          </div>
        </div>

        {/* Chart Rendering */}
        <div className="w-full h-64 sm:h-72">
          {!mounted ? (
            <div className="w-full h-full flex items-center justify-center bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl">
              <div className="flex flex-col items-center gap-2">
                <i className="fa-solid fa-spinner fa-spin text-purple-500 text-xl" />
                <span className="text-xs font-bold text-slate-400">Memuat visual grafik...</span>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={activeData}
                margin={{ top: 15, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as ChartDataPoint;
                      const isMet = data.completed >= data.target;
                      return (
                        <div className="rounded-2xl p-3 bg-white/95 dark:bg-slate-950/95 border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-md text-xs space-y-1.5 min-w-[170px]">
                          <p className="font-black text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1">
                            {data.label} <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">({data.fullDate})</span>
                          </p>
                          <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                            <span>Topik Selesai:</span>
                            <span className="font-extrabold text-purple-600 dark:text-purple-400">
                              {data.completed} topik
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                            <span>Target:</span>
                            <span className="font-bold text-slate-500 dark:text-slate-400">
                              {data.target} topik
                            </span>
                          </div>
                          {data.xpEarned > 0 && (
                            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                              <span>EXP Diperoleh:</span>
                              <span className="font-bold text-amber-500">+{data.xpEarned} EXP</span>
                            </div>
                          )}
                          <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1 font-bold">
                            {isMet ? (
                              <span className="text-emerald-600 dark:text-emerald-400 text-[10px] flex items-center gap-1">
                                <i className="fa-solid fa-circle-check" /> Target Tercapai 🎉
                              </span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400 text-[10px]">
                                Kurang {data.target - data.completed} topik
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine
                  y={currentTarget}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: `Target: ${currentTarget}`,
                    fill: '#f59e0b',
                    fontSize: 10,
                    fontWeight: 700,
                    position: 'insideTopRight',
                  }}
                />
                <Bar
                  dataKey="completed"
                  name="Topik Selesai"
                  radius={[8, 8, 2, 2]}
                  maxBarSize={45}
                >
                  {activeData.map((entry, index) => {
                    const isMet = entry.completed >= currentTarget;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={isMet ? '#8b5cf6' : '#6366f1'}
                        opacity={entry.completed === 0 ? 0.3 : 1}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}
