'use client';

import { useState, useMemo, useCallback } from 'react';
import type {
  MeetingWithStudents,
  TeacherOption,
  StudentOption,
} from '@/features/sessions/queries';
import { SessionDetailCard } from '@/features/sessions/components/calendar/SessionDetailCard';

interface HistoryViewProps {
  meetings: MeetingWithStudents[];
  teachers: TeacherOption[];
  students: StudentOption[];
  teacherMap: Map<string, string>;
}

export function HistoryView({ meetings, teachers, students, teacherMap }: HistoryViewProps) {
  const [searchStudent, setSearchStudent] = useState('');
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());

  const completed = useMemo(
    () => meetings.filter((m) => m.is_completed)
      .sort((a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime()),
    [meetings]
  );

  // Group by primary student name
  const grouped = useMemo(() => {
    const map = new Map<string, MeetingWithStudents[]>();
    completed.forEach((m) => {
      const studentName = m.meeting_students[0]?.students?.full_name ?? 'Tanpa Murid';
      if (!map.has(studentName)) map.set(studentName, []);
      map.get(studentName)!.push(m);
    });
    return map;
  }, [completed]);

  const filteredGroups = useMemo(() => {
    if (!searchStudent.trim()) return grouped;
    const q = searchStudent.toLowerCase();
    const result = new Map<string, MeetingWithStudents[]>();
    grouped.forEach((sessions, name) => {
      if (name.toLowerCase().includes(q)) result.set(name, sessions);
    });
    return result;
  }, [grouped, searchStudent]);

  const toggleStudent = useCallback((name: string) => {
    setExpandedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }, []);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-sm">🔍</span>
        <input
          type="text"
          placeholder="Cari nama murid..."
          value={searchStudent}
          onChange={(e) => setSearchStudent(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl bg-white dark:bg-[#0B0F19] border-2 border-slate-200/90 dark:border-purple-500/40 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-purple-500/50 shadow-sm transition-all"
        />
      </div>

      {filteredGroups.size === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200/80 dark:border-purple-500/30 py-16 text-center">
          <div className="text-3xl mb-2">📥</div>
          <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">Belum ada riwayat kelas selesai</p>
        </div>
      ) : (
        Array.from(filteredGroups.entries()).map(([studentName, sessions]) => {
          const isExpanded = expandedStudents.has(studentName);
          return (
            <div key={studentName} className="bg-white dark:bg-[#0B0F19] border-2 border-slate-200/90 dark:border-purple-500/40 rounded-2xl overflow-hidden shadow-sm dark:shadow-[0_0_20px_rgba(168,85,247,0.15)] dark:ring-1 dark:ring-purple-500/20">
              <button
                type="button"
                onClick={() => toggleStudent(studentName)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                    👨‍🎓 {studentName}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-semibold tabular-nums">
                    {sessions.length} sesi selesai
                  </span>
                </div>
                <span className={`text-slate-500 dark:text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-100 dark:border-slate-800 p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {sessions.map((m) => (
                    <SessionDetailCard
                      key={m.id}
                      meeting={m}
                      teachers={teachers}
                      students={students}
                      teacherMap={teacherMap}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}