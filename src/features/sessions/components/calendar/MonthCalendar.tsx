'use client';

import type { MeetingWithStudents } from '@/features/sessions/queries';
import { APP_TIME_ZONE, getDateKey, isLive } from '@/lib/formatDate';

export function toDateKey(date: Date): string {
  return getDateKey(date) ?? '';
}

export function isSameDateKey(a: string, b: string): boolean {
  return a === b;
}

export function formatTimeRange(dateIso: string): string {
  const start = new Date(dateIso);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) =>
    d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: APP_TIME_ZONE });
  return `${fmt(start)}–${fmt(end)} WIB`;
}

export function getTimeUntil(dateIso: string): string {
  const diffMs = new Date(dateIso).getTime() - Date.now();
  if (diffMs <= 0) return 'Segera';
  const mins = Math.floor(diffMs / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 48) return `dlm ${Math.floor(h / 24)}h`;
  if (h > 0) return `dlm ${h}j ${m}m`;
  return `dlm ${m}m`;
}

const IDN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const IDN_DAYS_SHORT = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];

interface MonthCalendarProps {
  year: number;
  month: number;
  meetingsByDate: Map<string, MeetingWithStudents[]>;
  selectedKey: string;
  onSelectDate: (key: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function MonthCalendar({
  year,
  month,
  meetingsByDate,
  selectedKey,
  onSelectDate,
  onPrev,
  onNext,
  onToday,
}: MonthCalendarProps) {
  const todayKey = toDateKey(new Date());

  const firstDay = new Date(Date.UTC(year, month, 1, 12));
  const startDow = firstDay.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0, 12)).getUTCDate();

  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="bg-white dark:bg-[#0B0F19] border-2 border-blue-400/40 dark:border-purple-500/40 rounded-2xl shadow-sm dark:shadow-[0_0_30px_rgba(168,85,247,0.18)] dark:ring-1 dark:ring-purple-500/25 overflow-hidden">
      {/* Calendar header */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/60">
        <button
          type="button"
          onClick={onPrev}
          className="w-8 h-8 rounded-xl flex items-center justify-center border border-blue-500/30 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-slate-200 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400"
          aria-label="Bulan sebelumnya"
        >
          ‹
        </button>
        <div className="flex items-center gap-3">
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            {IDN_MONTHS[month]} {year}
          </h3>
          <button
            type="button"
            onClick={onToday}
            className="text-xs font-extrabold px-3 py-1 rounded-lg border border-blue-500/40 dark:border-cyan-500/30 bg-blue-50 dark:bg-cyan-950/40 text-blue-700 dark:text-cyan-300 hover:bg-blue-100 dark:hover:bg-cyan-900/60 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            Hari Ini
          </button>
        </div>
        <button
          type="button"
          onClick={onNext}
          className="w-8 h-8 rounded-xl flex items-center justify-center border border-blue-500/30 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-slate-200 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400"
          aria-label="Bulan berikutnya"
        >
          ›
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-zinc-800 bg-slate-100/50 dark:bg-zinc-900/40">
        {IDN_DAYS_SHORT.map((d) => (
          <div key={d} className="py-2.5 text-center text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Date grid with stable min-height & text truncation */}
      <div className="grid grid-cols-7 overflow-hidden">
        {cells.map((day, idx) => {
          if (day === null) {
            return (
              <div
                key={`blank-${idx}`}
                className="min-h-[80px] sm:min-h-[92px] border-b border-r border-slate-100 dark:border-zinc-900/60 bg-slate-50/40 dark:bg-zinc-950/40 last:border-r-0"
              />
            );
          }

          const cellDate = new Date(Date.UTC(year, month, day, 12));
          const key = toDateKey(cellDate);
          const isSelected = isSameDateKey(key, selectedKey);
          const isToday = isSameDateKey(key, todayKey);
          const dayMeetings = meetingsByDate.get(key) ?? [];
          const isColRight = (idx % 7) === 6;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(key)}
              className={`min-h-[80px] sm:min-h-[92px] p-1.5 sm:p-2 text-left border-b border-r border-slate-200/70 dark:border-zinc-800/80 transition-all flex flex-col gap-1 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-cyan-400 overflow-hidden ${
                isColRight ? 'border-r-0' : ''
              } ${
                isSelected
                  ? 'bg-blue-50/80 dark:bg-purple-950/40 ring-1 ring-blue-500/50 dark:ring-purple-500/60 shadow-sm'
                  : 'hover:bg-blue-50/40 dark:hover:bg-zinc-900/50'
              }`}
            >
              {/* Day number */}
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black flex-shrink-0 ${
                isSelected && isToday
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : isSelected
                  ? 'bg-blue-500/20 dark:bg-cyan-500/20 text-blue-700 dark:text-cyan-300 border border-blue-500/30 dark:border-cyan-500/40'
                  : isToday
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-800 dark:text-slate-200'
              }`}>
                {day}
              </span>

              {/* Event pills */}
              {dayMeetings.slice(0, 2).map((m) => {
                const live = isLive(m.meeting_date);
                const done = m.is_completed;
                const timeStr = new Date(m.meeting_date).toLocaleTimeString('id-ID', {
                  hour: '2-digit', minute: '2-digit', hour12: false, timeZone: APP_TIME_ZONE,
                });
                const studentFirst = m.meeting_students[0]?.students?.full_name?.split(' ')[0] ?? '';
                return (
                  <span
                    key={m.id}
                    className={`block w-full max-w-full px-1.5 py-0.5 rounded text-[10px] font-bold truncate leading-tight border transition-all ${
                      live
                        ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                        : done
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                        : 'bg-blue-500/15 dark:bg-cyan-500/15 text-blue-700 dark:text-cyan-300 border-blue-500/30 dark:border-cyan-500/30'
                    }`}
                  >
                    {timeStr} {studentFirst}
                  </span>
                );
              })}
              {dayMeetings.length > 2 && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold px-1 truncate max-w-full">
                  +{dayMeetings.length - 2} lagi
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}