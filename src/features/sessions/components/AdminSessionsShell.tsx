'use client';

import { useState, useMemo, useCallback } from 'react';
import { toDateKey } from '@/features/sessions/components/calendar/MonthCalendar';
import { MonthCalendar } from '@/features/sessions/components/calendar/MonthCalendar';
import { HistoryView } from '@/features/sessions/components/history/HistoryView';
import { SessionDetailCard } from '@/features/sessions/components/calendar/SessionDetailCard';
import { CreateSessionModal } from '@/features/sessions/components/CreateSessionModal';
import { LegacyMeetingMapper } from '@/features/sessions/components/LegacyMeetingMapper';
import { formatDate, formatTime, getDateKey } from '@/lib/formatDate';
import type {
  MeetingWithStudents,
  TeacherOption,
  StudentOption,
} from '@/features/sessions/queries';

type ViewTab = 'calendar' | 'history';

const IDN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const IDN_DAYS_LONG = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

interface Props {
  meetings: MeetingWithStudents[];
  teachers: TeacherOption[];
  students: StudentOption[];
}

export function AdminSessionsShell({ meetings, teachers, students }: Props) {
  const today = new Date();
  const todayKey = getDateKey(today) ?? '';
  const [todayYear, todayMonth] = todayKey.split('-').map(Number);
  const [viewTab, setViewTab] = useState<ViewTab>('calendar');
  const [calYear, setCalYear] = useState(todayYear);
  const [calMonth, setCalMonth] = useState(todayMonth - 1);
  const [selectedKey, setSelectedKey] = useState(todayKey);

  const teacherMap = useMemo(() => {
    const map = new Map<string, string>();
    teachers.forEach((t) => { if (t.full_name) map.set(t.id, t.full_name); });
    return map;
  }, [teachers]);

  // Group all meetings by date key
  const meetingsByDate = useMemo(() => {
    const map = new Map<string, MeetingWithStudents[]>();
    meetings.forEach((m) => {
      const key = m.meeting_date ? toDateKey(new Date(m.meeting_date)) : '';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    });
    // Sort each day's meetings by time
    map.forEach((list) => list.sort((a, b) =>
      new Date(a.meeting_date).getTime() - new Date(b.meeting_date).getTime()
    ));
    return map;
  }, [meetings]);

  // Detail panel data
  const selectedMeetings = useMemo(
    () => meetingsByDate.get(selectedKey) ?? [],
    [meetingsByDate, selectedKey]
  );

  const selectedDateObj = useMemo(() => {
    return new Date(`${selectedKey}T00:00:00.000Z`);
  }, [selectedKey]);

  const formattedSelectedDate = useMemo(() => {
    return formatDate(selectedDateObj.toISOString(), {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  }, [selectedDateObj]);

  const completedCount = useMemo(
    () => meetings.filter((m) => m.is_completed).length,
    [meetings]
  );

  // CSV export
  const handleExportCSV = useCallback(() => {
    const headers = ['Tanggal', 'Waktu', 'Judul', 'Murid', 'Guru', 'Status', 'Catatan'];
    const rows = meetings.map((m) => {
      const dateStr = formatDate(m.meeting_date, {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });
      const timeStr = formatTime(m.meeting_date);
      const studentNames = m.meeting_students.map((ms) => ms.students?.full_name ?? '').join('; ');
      const teacher = '';
      const status = m.is_completed ? 'Selesai' : /live/i.test(m.meeting_date) ? 'Live' : 'Mendatang';
      return [dateStr, timeStr, m.title, studentNames, teacher, status, m.notes ?? '']
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `jadwal-${IDN_MONTHS[calMonth]}-${calYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [meetings, calMonth, calYear]);

  // Calendar navigation callbacks
  const prevMonth = useCallback(() => {
    setCalMonth((m) => { if (m === 0) { setCalYear((y) => y - 1); return 11; } return m - 1; });
  }, []);
  const nextMonth = useCallback(() => {
    setCalMonth((m) => { if (m === 11) { setCalYear((y) => y + 1); return 0; } return m + 1; });
  }, []);
  const goToday = useCallback(() => {
    const t = new Date();
    const key = getDateKey(t) ?? '';
    const [year, month] = key.split('-').map(Number);
    setCalYear(year);
    setCalMonth(month - 1);
    setSelectedKey(key);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-zinc-800">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-cyan-400 mb-1">
            Manajemen Jadwal
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Jadwal Pertemuan
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-200 font-medium">
            Kelola jadwal kelas, edit, hapus, atau atur ulang sesi.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border border-blue-500/40 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
          >
            📤 Export CSV
          </button>
          <CreateSessionModal teachers={teachers} students={students} />
        </div>
      </div>

      <LegacyMeetingMapper meetings={meetings} />

      {/* View Tabs */}
      <div className="flex items-center gap-1.5 bg-slate-100/90 dark:bg-zinc-900/80 p-1.5 rounded-xl border border-blue-200/80 dark:border-purple-500/30 w-fit">
        <button
          type="button"
          onClick={() => setViewTab('calendar')}
          className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-purple-400 ${
            viewTab === 'calendar'
              ? 'bg-white dark:bg-zinc-950 text-blue-600 dark:text-purple-300 border border-blue-500/40 dark:border-purple-500/40 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          📅 Kalender
        </button>
        <button
          type="button"
          onClick={() => setViewTab('history')}
          className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-purple-400 ${
            viewTab === 'history'
              ? 'bg-white dark:bg-zinc-950 text-blue-600 dark:text-purple-300 border border-blue-500/40 dark:border-purple-500/40 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          📜 Riwayat
          <span className="tabular-nums text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold">
            {completedCount}
          </span>
        </button>
      </div>

      {/* Calendar View */}
      {viewTab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Left: Monthly Calendar (lg:col-span-7 for 1280px laptop breath room, xl:col-span-8 for desktop) */}
          <div className="lg:col-span-7 xl:col-span-8">
            <MonthCalendar
              year={calYear}
              month={calMonth}
              meetingsByDate={meetingsByDate}
              selectedKey={selectedKey}
              onSelectDate={setSelectedKey}
              onPrev={prevMonth}
              onNext={nextMonth}
              onToday={goToday}
            />
          </div>

          {/* Right: Detail Panel (lg:col-span-5 for 1280px laptop, xl:col-span-4 for desktop) */}
          <div className="lg:col-span-5 xl:col-span-4">
            <div className="sticky top-6 bg-white dark:bg-[#0B0F19] border-2 border-blue-400/40 dark:border-purple-500/40 rounded-2xl shadow-sm dark:shadow-[0_0_30px_rgba(168,85,247,0.18)] dark:ring-1 dark:ring-purple-500/25 overflow-hidden flex flex-col max-h-[calc(100vh-140px)]">
              {/* Detail panel header */}
              <div className="px-5 py-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/60">
                <p className="text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-cyan-400 mb-0.5">
                  {IDN_DAYS_LONG[selectedDateObj.getUTCDay()]}
                </p>
                <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                  {formattedSelectedDate}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                  {selectedMeetings.length === 0
                    ? 'Tidak ada jadwal'
                    : `${selectedMeetings.length} jadwal`}
                </p>
              </div>

              {/* Cards */}
              <div className="p-4 space-y-3 max-h-[calc(100vh-240px)] overflow-y-auto">
                {selectedMeetings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="text-4xl mb-3">📬</div>
                    <p className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                      Tidak ada jadwal di tanggal ini.
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1 max-w-[200px]">
                      Pilih tanggal lain di kalender, atau buat jadwal baru.
                    </p>
                  </div>
                ) : (
                  selectedMeetings.map((m) => (
                    <SessionDetailCard
                      key={m.id}
                      meeting={m}
                      teachers={teachers}
                      students={students}
                      teacherMap={teacherMap}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History View */}
      {viewTab === 'history' && (
        <HistoryView
          meetings={meetings}
          teachers={teachers}
          students={students}
          teacherMap={teacherMap}
        />
      )}

    </div>
  );
}
