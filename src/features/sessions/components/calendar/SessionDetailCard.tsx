'use client';

import { AdminSessionActions } from '@/features/sessions/components/AdminSessionActions';
import type {
  MeetingWithStudents,
  TeacherOption,
  StudentOption,
} from '@/features/sessions/queries';
import { isLive } from '@/lib/formatDate';
import { formatTimeRange, getTimeUntil } from './MonthCalendar';

interface SessionDetailCardProps {
  meeting: MeetingWithStudents;
  teachers: TeacherOption[];
  students: StudentOption[];
  teacherMap: Map<string, string>;
}

function StatusBadge({ meeting }: { meeting: MeetingWithStudents }) {
  const live = isLive(meeting.meeting_date);
  const done = meeting.is_completed;
  if (live) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/50 animate-pulse">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
      LIVE
    </span>
  );
  if (done) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/50">
      ✓ Selesai
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/50">
      ⏰ {getTimeUntil(meeting.meeting_date)}
    </span>
  );
}

export function SessionDetailCard({
  meeting,
  teachers,
  students,
  teacherMap,
}: SessionDetailCardProps) {
  const live = isLive(meeting.meeting_date);
  const studentNames = meeting.meeting_students
    .map((ms) => ms.students?.full_name)
    .filter((n): n is string => Boolean(n));
  const teacherName = meeting.teacher_id
    ? (teacherMap.get(meeting.teacher_id) ?? 'Guru tidak dikenal')
    : 'Belum ditentukan';

  return (
    <div className={`bg-white dark:bg-[#0B0F19] border-2 rounded-2xl p-4 flex flex-col gap-3 shadow-sm transition-all hover:shadow-md ${
      live
        ? 'border-rose-400 dark:border-rose-600 ring-1 ring-rose-400/30 dark:ring-rose-800/60 dark:shadow-[0_0_15px_rgba(244,63,94,0.2)]'
        : 'border-slate-200/90 dark:border-purple-500/40 hover:border-blue-400 dark:hover:border-purple-400 dark:shadow-[0_0_15px_rgba(168,85,247,0.12)]'
    }`}>
      {/* Card top: status + time */}
      <div className="flex items-center justify-between gap-2">
        <StatusBadge meeting={meeting} />
        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 tabular-nums">
          {formatTimeRange(meeting.meeting_date)}
        </span>
      </div>

      {/* Title + session progress */}
      <div>
        <h4 className="font-extrabold text-slate-900 dark:text-white text-sm leading-snug line-clamp-2">
          {meeting.title}
        </h4>
        {meeting.session_count > 1 && (
          <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
            Sesi {meeting.session_number}/{meeting.session_count}
          </span>
        )}
      </div>

      {/* Chips */}
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50/80 text-indigo-900 border border-indigo-200/60 dark:bg-indigo-950/80 dark:text-indigo-200 dark:border-indigo-700/50">
          <span className="flex-shrink-0">👨‍🎓</span>
          <span className="font-bold truncate">
            {studentNames.length > 0 ? studentNames.join(', ') : 'Belum ditentukan'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50/80 text-purple-900 border border-purple-200/60 dark:bg-purple-950/80 dark:text-purple-200 dark:border-purple-700/50">
          <span className="flex-shrink-0">👨‍🏫</span>
          <span className="font-bold truncate">{teacherName}</span>
        </div>
        {meeting.notes?.trim() && (
          <div className="flex items-start gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50/80 text-amber-950 border border-amber-200/60 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700/50">
            <span className="flex-shrink-0">📖</span>
            <span className="font-bold line-clamp-1">{meeting.notes.trim()}</span>
          </div>
        )}
      </div>

      {/* Progress report */}
      {meeting.progress_report && (
        <p className="text-xs text-slate-500 dark:text-slate-400 italic line-clamp-2 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
          📝 {meeting.progress_report}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
        {meeting.link_url ? (
          <a
            href={meeting.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex-1 text-center py-2 px-3 rounded-xl text-xs font-bold shadow-sm transition-all truncate ${
              live
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            🔗 {live ? 'Masuk Zoom' : 'Buka Link'}
          </a>
        ) : (
          <span className="flex-1 text-center py-2 px-2 rounded-xl text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 truncate">
            ⚠️ Link Belum Ada
          </span>
        )}
        <div className="flex items-center gap-1 flex-shrink-0">
          <AdminSessionActions meeting={meeting} teachers={teachers} students={students} />
        </div>
      </div>
    </div>
  );
}