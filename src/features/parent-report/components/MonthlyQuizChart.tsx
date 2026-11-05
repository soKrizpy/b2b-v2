'use client';
// src/features/parent-report/components/MonthlyQuizChart.tsx
// Monthly quiz score bar chart — CSS bars replacing recharts.

import { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, Award, Target } from 'lucide-react';
import type { MonthlySnapshot } from '@/features/parent-report/queries.student';

interface MonthlyQuizChartProps {
  snapshots: MonthlySnapshot[];
}

function formatShortMonth(monthYear: string, fallback: string): string {
  const parts = monthYear.split('-');
  if (parts.length === 2) {
    const y = Number(parts[0]); const m = Number(parts[1]) - 1;
    if (!Number.isNaN(y) && !Number.isNaN(m)) {
      const d = new Date(y, m, 1);
      return `${d.toLocaleDateString('id-ID', { month: 'short' })} '${String(y).slice(-2)}`;
    }
  }
  return fallback.slice(0, 3);
}

function barColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 70) return 'bg-indigo-500';
  if (score > 0)   return 'bg-amber-500';
  return 'bg-slate-300 dark:bg-slate-600';
}

export function MonthlyQuizChart({ snapshots }: MonthlyQuizChartProps) {
  const [rangeMonths, setRangeMonths] = useState<6 | 12>(6);

  const chartData = useMemo(() => {
    return snapshots.slice(0, rangeMonths).reverse().map((s) => ({
      ...s,
      shortLabel: formatShortMonth(s.monthYear, s.monthLabel),
    }));
  }, [snapshots, rangeMonths]);

  const stats = useMemo(() => {
    const active = chartData.filter((d) => d.avgQuizScore > 0);
    const avg = active.length > 0 ? Math.round(active.reduce((s, d) => s + d.avgQuizScore, 0) / active.length) : 0;
    const best = active.length > 0 ? active.reduce((b, d) => d.avgQuizScore > b.avgQuizScore ? d : b) : null;
    const delta = active.length >= 2 ? active[active.length - 1].avgQuizScore - active[active.length - 2].avgQuizScore : null;
    return { avg, best, delta };
  }, [chartData]);

  const maxScore = Math.max(...chartData.map((d) => d.avgQuizScore), 100);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-blue-400/40 dark:border-purple-500/40 rounded-2xl p-5 sm:p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <BarChart3 className="w-4 h-4" />
            <span>Analisis Performa Akademik</span>
          </div>
          <h3 className="text-base sm:text-lg font-extrabold text-zinc-900 dark:text-white mt-0.5">
            Perbandingan Rata-Rata Kuis Bulanan
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Tren capaian nilai kuis bulanan dibandingkan batas kelulusan (70%)
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl self-start sm:self-auto">
          {([6, 12] as const).map((v) => (
            <button key={v} type="button" onClick={() => setRangeMonths(v)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                rangeMonths === v ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-zinc-600 dark:text-zinc-400'
              }`}>
              {v} Bulan
            </button>
          ))}
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-5">
        {[
          {
            icon: TrendingUp, iconColor: 'text-indigo-600 dark:text-indigo-400', iconBg: 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800',
            label: `Rata-Rata (${rangeMonths} Bulan)`,
            value: stats.avg > 0 ? `${stats.avg}%` : '—',
            sub: stats.delta !== null ? (stats.delta >= 0 ? `+${stats.delta}%` : `${stats.delta}%`) : undefined,
            subColor: stats.delta !== null && stats.delta >= 0 ? 'text-emerald-600' : 'text-amber-600',
          },
          {
            icon: Award, iconColor: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800',
            label: 'Capaian Tertinggi',
            value: stats.best ? `${stats.best.avgQuizScore}% · ${stats.best.shortLabel}` : 'Belum ada data',
          },
          {
            icon: Target, iconColor: 'text-amber-600 dark:text-amber-400', iconBg: 'bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800',
            label: 'Standar Kelulusan',
            value: 'Min. 70%',
          },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-700/60 px-4 py-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${s.iconBg}`}>
              <s.icon className={`w-4 h-4 ${s.iconColor}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{s.label}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-black text-zinc-900 dark:text-white truncate">{s.value}</span>
                {s.sub && <span className={`text-xs font-bold font-mono tabular-nums ${s.subColor}`}>{s.sub}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CSS bar chart */}
      <div className="relative h-64 w-full">
        {/* 70% reference line */}
        <div
          className="absolute inset-x-0 border-t-2 border-dashed border-indigo-400/60 pointer-events-none z-10"
          style={{ bottom: `${(70 / maxScore) * 100}%` }}
        >
          <span className="absolute right-0 -top-4 text-[10px] font-bold text-indigo-500 dark:text-indigo-400">Target 70%</span>
        </div>

        <div className="flex items-end gap-2 h-full pb-8">
          {chartData.map((d) => {
            const barH = maxScore > 0 ? (d.avgQuizScore / maxScore) * 100 : 0;
            return (
              <div key={d.monthYear} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-20 w-52 rounded-xl bg-zinc-900 text-white px-3.5 py-2.5 shadow-xl border border-zinc-700 text-xs">
                  <p className="font-bold text-zinc-100 mb-1">{d.monthLabel}</p>
                  <div className="space-y-1 text-zinc-300">
                    <p className="flex justify-between gap-4"><span>Rata-rata Kuis:</span><span className="font-mono font-bold text-white">{d.avgQuizScore > 0 ? `${d.avgQuizScore}%` : '—'}</span></p>
                    <p className="flex justify-between gap-4"><span>Topik Lulus:</span><span className="font-mono text-emerald-400">{d.topicsCompleted} topik</span></p>
                    <p className="flex justify-between gap-4"><span>Kehadiran:</span><span className="font-mono text-cyan-300">{d.attendedCount}/{d.totalScheduled} ({d.attendanceRate}%)</span></p>
                  </div>
                </div>

                {/* Bar */}
                <div
                  className={`w-full rounded-t-lg transition-all duration-700 ease-out ${barColor(d.avgQuizScore)}`}
                  style={{ height: `${barH}%`, minHeight: d.avgQuizScore > 0 ? '4px' : '0' }}
                />
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 text-center">{d.shortLabel}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
        {[
          { color: 'bg-emerald-500', label: 'Sangat Baik (≥80%)' },
          { color: 'bg-indigo-500',  label: 'Lulus (70–79%)' },
          { color: 'bg-amber-500',   label: 'Perlu Latihan (<70%)' },
        ].map((l) => (
          <span key={l.label} className="inline-flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-sm ${l.color} inline-block`} />
            <span>{l.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
