'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate, formatTime } from '@/lib/formatDate';
import type { MeetingWithStudents } from '@/features/sessions/queries';

interface PublishedTopicOption { id: number; title: string }
interface ModuleOption {
  id: number;
  title: string | null;
  level: string | null;
  publishedTopicCount: number;
  publishedTopics: PublishedTopicOption[];
}

interface Props { meetings: MeetingWithStudents[] }

export function LegacyMeetingMapper({ meetings }: Props) {
  const router = useRouter();
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [selection, setSelection] = useState<Record<number, { moduleId: string; sessionNumber: string }>>({});
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ error?: string; success?: string } | null>(null);

  const unmappedMeetings = useMemo(
    () => meetings.filter((meeting) => meeting.topic_id == null),
    [meetings]
  );
  const visibleMeetings = useMemo(() => {
    const query = filter.trim().toLocaleLowerCase();
    if (!query) return unmappedMeetings;
    return unmappedMeetings.filter((meeting) =>
      `${meeting.title} ${meeting.id} ${meeting.meeting_students.map((row) => row.students?.full_name ?? '').join(' ')}`
        .toLocaleLowerCase().includes(query)
    );
  }, [filter, unmappedMeetings]);

  async function loadModules() {
    setLoading(true);
    setNotice(null);
    try {
      const response = await fetch('/api/curriculum/modules', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Gagal memuat modul dan topik.');
      setModules(Array.isArray(body) ? body : []);
      setLoaded(true);
    } catch (error) {
      setNotice({ error: error instanceof Error ? error.message : 'Gagal memuat modul dan topik.' });
    } finally {
      setLoading(false);
    }
  }

  async function submitMapping(meeting: MeetingWithStudents) {
    const choice = selection[meeting.id];
    const moduleId = Number(choice?.moduleId);
    const sessionNumber = Number(choice?.sessionNumber);
    const selectedModule = modules.find((item) => item.id === moduleId);
    const topic = selectedModule?.publishedTopics[sessionNumber - 1];
    if (!selectedModule || !topic || sessionNumber < 1) {
      setNotice({ error: 'Pilih modul dan sesi yang memiliki topik terpublikasi.' });
      return;
    }

    const students = meeting.meeting_students
      .map((row) => row.students?.full_name?.trim())
      .filter((name): name is string => Boolean(name));
    const date = `${formatDate(meeting.meeting_date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${formatTime(meeting.meeting_date)}`;
    const roster = students.length > 0 ? students.join(', ') : 'Tidak ada siswa yang terdaftar';
    const confirmation = [
      `Jadwal: ${meeting.title} (#${meeting.id})`,
      `Waktu: ${date}`,
      `Modul: ${selectedModule.title ?? `Modul ${selectedModule.id}`}`,
      `Sesi ${sessionNumber}/${selectedModule.publishedTopicCount}: ${topic.title}`,
      `Siswa (${meeting.meeting_students.length}): ${roster}`,
      '',
      'Pemetaan ini akan membuka topik untuk siswa terdaftar mulai dari waktu jadwal. Nomor sesi dan jumlah sesi jadwal diselaraskan dengan modul; tanggal, guru, laporan, dan daftar siswa tidak diubah.',
      'Lanjutkan?',
    ].join('\n');
    if (!window.confirm(confirmation)) return;

    setPendingId(meeting.id);
    setNotice(null);
    try {
      const response = await fetch(`/api/sessions/${meeting.id}/mapping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module_id: selectedModule.id, session_number: sessionNumber }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Pemetaan jadwal gagal.');
      setNotice({ success: `Jadwal #${meeting.id} dipasangkan ke “${topic.title}”.` });
      router.refresh();
    } catch (error) {
      setNotice({ error: error instanceof Error ? error.message : 'Pemetaan jadwal gagal.' });
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-amber-300/70 dark:border-amber-700/60 bg-amber-50/70 dark:bg-amber-950/20 p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="font-black text-slate-900 dark:text-white">Pemetaan Jadwal Lama</h2>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
            {unmappedMeetings.length} jadwal belum memiliki topik. Pilih modul dan sesi secara manual; sistem tidak menebak dari judul atau tanggal.
          </p>
        </div>
        <button type="button" onClick={loadModules} disabled={loading}
          className="shrink-0 rounded-xl border border-amber-500/50 bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 disabled:opacity-60">
          {loading ? 'Memuat…' : loaded ? 'Muat ulang pilihan' : 'Mulai pemetaan'}
        </button>
      </div>

      {notice?.error && <p role="alert" className="rounded-lg bg-red-100 dark:bg-red-950/50 px-3 py-2 text-sm text-red-800 dark:text-red-200">{notice.error}</p>}
      {notice?.success && <p role="status" className="rounded-lg bg-emerald-100 dark:bg-emerald-950/50 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">{notice.success}</p>}

      {loaded && unmappedMeetings.length > 0 && (
        <>
          <label className="block">
            <span className="sr-only">Cari jadwal lama</span>
            <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Cari judul, ID jadwal, atau nama siswa…"
              className="w-full rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-slate-900 dark:text-white" />
          </label>
          <div className="space-y-3 max-h-[36rem] overflow-y-auto pr-1">
            {visibleMeetings.map((meeting) => {
              const current = selection[meeting.id] ?? {
                moduleId: meeting.module_id == null ? '' : String(meeting.module_id),
                sessionNumber: '',
              };
              const selectedModule = modules.find((module) => String(module.id) === current.moduleId);
              const selectedTopic = selectedModule?.publishedTopics[Number(current.sessionNumber) - 1];
              const date = `${formatDate(meeting.meeting_date, { day: 'numeric', month: 'short', year: 'numeric' })} · ${formatTime(meeting.meeting_date)}`;
              const names = meeting.meeting_students.map((row) => row.students?.full_name).filter(Boolean);
              return (
                <article key={meeting.id} className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 p-3 sm:p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">{meeting.title} <span className="font-normal text-slate-500">#{meeting.id}</span></p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{date} · Guru: {meeting.teacher_id ? (meeting.teacher_id.slice(0, 8) + '…') : 'belum ditentukan'}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{meeting.meeting_students.length} siswa: {names.length ? names.join(', ') : 'nama siswa tidak tersedia'}</p>
                    </div>
                    {meeting.is_completed && <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2 py-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-200">Sudah selesai</span>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Modul
                      <select value={current.moduleId} disabled={meeting.module_id != null} onChange={(event) => setSelection((prev) => ({ ...prev, [meeting.id]: { moduleId: event.target.value, sessionNumber: '' } }))}
                        className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-2 text-sm disabled:opacity-70">
                        <option value="">Pilih modul</option>
                        {modules.filter((module) => module.publishedTopicCount > 0).map((module) => <option key={module.id} value={module.id}>{module.title ?? `Modul ${module.id}`} · {module.publishedTopicCount} topik</option>)}
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Sesi / topik
                      <select value={current.sessionNumber} disabled={!selectedModule} onChange={(event) => setSelection((prev) => ({ ...prev, [meeting.id]: { ...current, sessionNumber: event.target.value } }))}
                        className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-2 text-sm disabled:opacity-60">
                        <option value="">Pilih sesi</option>
                        {selectedModule?.publishedTopics.map((topic, index) => <option key={topic.id} value={index + 1}>Sesi {index + 1}: {topic.title}</option>)}
                      </select>
                    </label>
                  </div>
                  {selectedTopic && <p className="rounded-lg bg-indigo-50 dark:bg-indigo-950/30 px-3 py-2 text-xs text-indigo-900 dark:text-indigo-200">Preview: {date} · Sesi {current.sessionNumber}/{selectedModule?.publishedTopicCount} membuka “{selectedTopic.title}” untuk {meeting.meeting_students.length} siswa terdaftar.</p>}
                  <div className="flex justify-end">
                    <button type="button" onClick={() => submitMapping(meeting)} disabled={!selectedTopic || pendingId === meeting.id}
                      className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
                      {pendingId === meeting.id ? 'Menyimpan…' : 'Tinjau & petakan'}
                    </button>
                  </div>
                </article>
              );
            })}
            {visibleMeetings.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Tidak ada jadwal yang cocok dengan pencarian.</p>}
          </div>
        </>
      )}
      {loaded && unmappedMeetings.length === 0 && <p className="rounded-lg bg-white/70 dark:bg-zinc-900 px-3 py-3 text-sm text-slate-700 dark:text-slate-300">Semua jadwal memiliki topik yang dipasangkan.</p>}
    </section>
  );
}
