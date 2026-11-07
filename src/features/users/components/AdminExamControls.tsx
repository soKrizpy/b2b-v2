'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  getManualCertificateTopics,
  issueManualStudentCertificate,
  setStudentAssessmentUnlock,
  type ManualCertificateTopicOption,
} from '@/features/users/actions';
import type { AssignedModule } from '@/features/users/queries';
import type { ModuleRow } from '@/types/database';
import { CertificateArtwork } from '@/features/certificates/components/CertificateArtwork';

interface Props {
  studentId: string;
  studentName: string;
  modules: AssignedModule[];
  allModules: ModuleRow[];
  unlockedModuleIds: number[];
  certificateModuleIds: number[];
}

function formatToday() {
  return new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getTierLabel(score: number) {
  if (score >= 86) return 'EXCELLENT';
  if (score >= 75) return 'ACHIEVEMENT';
  return 'COMPLETION';
}

const PREVIEW_QR_URL = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&format=svg&margin=4&data=${encodeURIComponent('BITS2BYTES CERTIFICATE PREVIEW ONLY - QR NOT VALID')}`;

export function AdminExamControls({
  studentId,
  studentName,
  modules,
  allModules,
  unlockedModuleIds,
  certificateModuleIds,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [scores, setScores] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [topicOptions, setTopicOptions] = useState<ManualCertificateTopicOption[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<Record<number, number[]>>({});
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [topicsError, setTopicsError] = useState<string | null>(null);

  const certificateModules = useMemo(() => {
    const assignedById = new Map(modules.map((module) => [module.module_id, module]));
    const merged = allModules.map((module) => {
      const assigned = assignedById.get(module.id);
      return {
        module_id: module.id,
        title: module.title ?? `Modul ${module.id}`,
        level: module.level,
        status: assigned?.status ?? 'unassigned',
      };
    });
    const knownIds = new Set(merged.map((module) => module.module_id));
    for (const assigned of modules) {
      if (!knownIds.has(assigned.module_id)) merged.push(assigned);
    }
    return merged;
  }, [allModules, modules]);
  const moduleIds = useMemo(() => certificateModules.map((module) => module.module_id), [certificateModules]);
  const moduleKey = moduleIds.join(',');

  useEffect(() => {
    let cancelled = false;
    async function loadTopics() {
      if (moduleIds.length === 0) {
        setTopicsLoading(false);
        return;
      }
      setTopicsLoading(true);
      const result = await getManualCertificateTopics(studentId, moduleIds);
      if (cancelled) return;
      if (!result.success) {
        setTopicsError(result.error);
      } else {
        setTopicsError(null);
        setTopicOptions(result.topics);
        const defaults: Record<number, number[]> = {};
        for (const module of certificateModules) {
          defaults[module.module_id] = result.topics
            .filter((topic) => topic.module_id === module.module_id && topic.trackedCompleted)
            .map((topic) => topic.id);
        }
        setSelectedTopicIds(defaults);
      }
      setTopicsLoading(false);
    }
    void loadTopics();
    return () => { cancelled = true; };
  }, [studentId, moduleKey, moduleIds, certificateModules]);

  function toggleUnlock(moduleId: number, currentlyUnlocked: boolean) {
    const action = currentlyUnlocked ? 'mencabut akses ujian' : 'membuka ujian';
    if (!confirm(`Yakin ${action} untuk siswa ini?`)) return;
    startTransition(async () => {
      const result = await setStudentAssessmentUnlock(studentId, moduleId, !currentlyUnlocked);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function toggleTopic(moduleId: number, topicId: number, checked: boolean) {
    setSelectedTopicIds((current) => {
      const selected = current[moduleId] ?? [];
      return {
        ...current,
        [moduleId]: checked
          ? [...selected, topicId]
          : selected.filter((id) => id !== topicId),
      };
    });
  }

  function issueCertificate(moduleId: number) {
    const rawScore = scores[moduleId] ?? '';
    const score = Number(rawScore);
    const note = notes[moduleId] ?? '';
    const topicIds = selectedTopicIds[moduleId] ?? [];
    if (rawScore.trim() === '' || !Number.isInteger(score) || score < 0 || score > 100) {
      toast.error('Skor harus berupa angka 0–100.');
      return;
    }
    if (note.trim().length < 5) {
      toast.error('Isi alasan penerbitan minimal 5 karakter.');
      return;
    }
    if (topicIds.length === 0) {
      toast.error('Pilih minimal satu materi yang benar-benar diikuti siswa.');
      return;
    }
    if (!confirm('Terbitkan sertifikat manual beserta daftar materi yang dipilih? Sertifikat tidak dapat diterbitkan dua kali untuk modul yang sama.')) return;

    startTransition(async () => {
      const result = await issueManualStudentCertificate(studentId, moduleId, score, note, topicIds);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  if (certificateModules.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] p-4 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Siswa belum memiliki modul. Aktifkan modul terlebih dahulu di tab Learning Path.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
        <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
          ⚠️ Kontrol khusus admin
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
          Unlock ujian tetap mensyaratkan enrollment aktif. Untuk pemulihan sertifikat, admin dapat memilih modul dan materi secara manual meskipun enrollment atau progres digital siswa tidak tercatat akibat error. Pastikan materi yang dicentang benar-benar pernah diikuti siswa; alasan penerbitan wajib dicatat.
        </p>
      </div>

      {topicsError && (
        <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
          {topicsError}
        </div>
      )}

      {certificateModules.map((module) => {
        const isUnlocked = unlockedModuleIds.includes(module.module_id);
        const hasCertificate = certificateModuleIds.includes(module.module_id);
        const scoreValue = scores[module.module_id] ?? '';
        const score = scoreValue.trim() === '' ? 0 : Math.min(100, Math.max(0, Number(scoreValue) || 0));
        const note = notes[module.module_id] ?? '';
        const moduleTopics = topicOptions.filter((topic) => topic.module_id === module.module_id);
        const selectedIds = selectedTopicIds[module.module_id] ?? [];
        const selectedTopics = moduleTopics.filter((topic) => selectedIds.includes(topic.id));
        const canPreview = !hasCertificate;

        return (
          <section
            key={module.module_id}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white">{module.title}</p>
                <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                  {module.status === 'active' ? 'Enrollment aktif' : module.status === 'paused' ? 'Modul dijeda' : 'Belum terdaftar · pemulihan manual'}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${isUnlocked
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-500/10 text-slate-600 dark:text-slate-300'
              }`}>
                {isUnlocked ? 'Ujian dibuka' : 'Gate normal'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Akses ujian akhir</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {isUnlocked ? 'Siswa dapat langsung memulai ujian.' : 'Ikuti mastery gate seperti biasa.'}
                </p>
              </div>
              <button
                type="button"
                disabled={pending || (module.status !== 'active' && !isUnlocked)}
                onClick={() => toggleUnlock(module.module_id, isUnlocked)}
                className={`shrink-0 rounded-xl px-3 py-2 text-[11px] font-bold text-white disabled:opacity-50 ${isUnlocked
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {pending ? 'Memproses…' : isUnlocked ? 'Cabut unlock' : 'Unlock ujian'}
              </button>
            </div>

            <div className="border-t border-[var(--border)] pt-3 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Sertifikat manual</p>
                {hasCertificate && (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                    Sudah terbit
                  </span>
                )}
              </div>
              {hasCertificate ? (
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Sertifikat untuk modul ini sudah ada. Sistem mencegah penerbitan duplikat.
                </p>
              ) : (
                <>
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                    Skor terverifikasi yang dicantumkan (0–100)
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={scoreValue}
                      onChange={(event) => setScores((current) => ({ ...current, [module.module_id]: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-slate-900 dark:text-white"
                    />
                  </label>

                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold text-slate-800 dark:text-slate-100">Materi yang benar-benar diikuti</p>
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">{selectedIds.length} dipilih</span>
                    </div>
                    <p className="mt-1 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
                      Materi dengan tanda “Progres tercatat” otomatis tercentang. Centang manual materi yang diikuti tetapi tidak tercatat karena kendala sistem.
                    </p>
                    {topicsLoading ? (
                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Memuat daftar materi…</p>
                    ) : moduleTopics.length === 0 ? (
                      <p className="mt-3 text-xs text-rose-600 dark:text-rose-300">Belum ada daftar topik pada modul ini.</p>
                    ) : (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {moduleTopics.map((topic) => {
                          const checked = selectedIds.includes(topic.id);
                          return (
                            <label key={topic.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) => toggleTopic(module.module_id, topic.id, event.target.checked)}
                                className="mt-0.5 h-4 w-4 accent-[#7cc62f]"
                              />
                              <span className="min-w-0">
                                <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100">{topic.order_index + 1}. {topic.title}</span>
                                <span className={`mt-0.5 block text-[9px] font-semibold ${topic.trackedCompleted
                                  ? 'text-emerald-700 dark:text-emerald-300'
                                  : 'text-amber-700 dark:text-amber-300'
                                }`}>
                                  {topic.trackedCompleted ? '✓ Progres tercatat' : topic.status === 'published' ? 'Pilih manual · progres tidak tercatat' : 'Topik belum dipublikasikan'}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                    Alasan / catatan admin (wajib)
                    <textarea
                      rows={2}
                      value={note}
                      onChange={(event) => setNotes((current) => ({ ...current, [module.module_id]: event.target.value }))}
                      placeholder="Contoh: siswa mengikuti materi secara langsung, tetapi progres digital tidak tercatat karena kendala sistem."
                      className="mt-1 w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-slate-900 dark:text-white"
                    />
                  </label>

                  {canPreview && (
                    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-3 dark:border-indigo-900/70 dark:bg-indigo-950/20">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-extrabold text-indigo-950 dark:text-indigo-100">Live Preview Sertifikat</p>
                          <p className="mt-0.5 text-[10px] text-indigo-700 dark:text-indigo-300">Tampilan mengikuti desain sertifikat yang akan diterbitkan.</p>
                        </div>
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">Preview · belum valid</span>
                      </div>
                      <div className="overflow-hidden rounded-xl">
                        <CertificateArtwork
                          studentName={studentName}
                          moduleTitle={module.title}
                          score={score}
                          tierLabel={getTierLabel(score)}
                          issuedAt={formatToday()}
                          certificateNumber="B2B-PREVIEW"
                          qrUrl={PREVIEW_QR_URL}
                        />
                      </div>
                      <p className="mt-2 text-[9px] leading-relaxed text-indigo-700 dark:text-indigo-300">
                        QR pada pratinjau ini hanya contoh dan tidak dapat diverifikasi. QR aktif dan nomor sertifikat asli dibuat setelah admin menerbitkan sertifikat.
                      </p>

                      <div className="mt-3 rounded-xl border border-indigo-200 bg-white p-3 dark:border-indigo-900 dark:bg-slate-950/60">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">Rekam Materi untuk Halaman QR</p>
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">{selectedTopics.length} materi</span>
                        </div>
                        {selectedTopics.length > 0 ? (
                          <ol className="mt-2 grid gap-1.5 sm:grid-cols-2">
                            {selectedTopics
                              .slice()
                              .sort((a, b) => a.order_index - b.order_index)
                              .map((topic, index) => (
                                <li key={topic.id} className="flex items-start gap-2 text-[10px] text-slate-700 dark:text-slate-200">
                                  <span className="font-black text-[#5fa31f]">{index + 1}.</span>
                                  <span>{topic.title}</span>
                                </li>
                              ))}
                          </ol>
                        ) : (
                          <p className="mt-2 text-[10px] text-amber-700 dark:text-amber-300">Pilih materi di atas agar daftar ini muncul pada halaman verifikasi.</p>
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={pending || topicsLoading || selectedIds.length === 0 || !scoreValue.trim() || note.trim().length < 5}
                    onClick={() => issueCertificate(module.module_id)}
                    className="w-full rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {pending ? 'Memproses…' : 'Terbitkan sertifikat manual'}
                  </button>
                </>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
