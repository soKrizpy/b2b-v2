'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  issueManualStudentCertificate,
  setStudentAssessmentUnlock,
} from '@/features/users/actions';
import type { AssignedModule } from '@/features/users/queries';

interface Props {
  studentId: string;
  modules: AssignedModule[];
  unlockedModuleIds: number[];
  certificateModuleIds: number[];
}

export function AdminExamControls({
  studentId,
  modules,
  unlockedModuleIds,
  certificateModuleIds,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [scores, setScores] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});

  function toggleUnlock(moduleId: number, currentlyUnlocked: boolean) {
    const action = currentlyUnlocked ? 'mencabut akses ujian' : 'membuka ujian';
    if (!confirm(`Yakin ${action} untuk siswa ini?`)) return;
    startTransition(async () => {
      const result = await setStudentAssessmentUnlock(
        studentId,
        moduleId,
        !currentlyUnlocked,
      );
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function issueCertificate(moduleId: number) {
    const rawScore = scores[moduleId] ?? '';
    const score = Number(rawScore);
    const note = notes[moduleId] ?? '';
    if (rawScore.trim() === '' || !Number.isInteger(score) || score < 0 || score > 100) {
      toast.error('Skor harus berupa angka 0–100.');
      return;
    }
    if (note.trim().length < 5) {
      toast.error('Isi alasan penerbitan minimal 5 karakter.');
      return;
    }
    if (!confirm('Terbitkan sertifikat manual untuk siswa ini? Sertifikat tidak dapat diterbitkan dua kali untuk modul yang sama.')) return;

    startTransition(async () => {
      const result = await issueManualStudentCertificate(studentId, moduleId, score, note);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  if (modules.length === 0) {
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
          Unlock ujian melewati syarat penyelesaian topik, tetapi tidak melewati status enrollment aktif atau batas dua percobaan. Penerbitan sertifikat manual tidak membuat riwayat attempt ujian.
        </p>
      </div>

      {modules.map((module) => {
        const isUnlocked = unlockedModuleIds.includes(module.module_id);
        const hasCertificate = certificateModuleIds.includes(module.module_id);
        const score = scores[module.module_id] ?? '';
        const note = notes[module.module_id] ?? '';

        return (
          <section
            key={module.module_id}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white">{module.title}</p>
                <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                  {module.status === 'active' ? 'Enrollment aktif' : 'Modul dijeda'}
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

            <div className="border-t border-[var(--border)] pt-3 flex flex-col gap-2">
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
                      value={score}
                      onChange={(event) => setScores((current) => ({ ...current, [module.module_id]: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-slate-900 dark:text-white"
                    />
                  </label>
                  <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                    Alasan / catatan admin (wajib)
                    <textarea
                      rows={2}
                      value={note}
                      onChange={(event) => setNotes((current) => ({ ...current, [module.module_id]: event.target.value }))}
                      placeholder="Contoh: pengakuan hasil ujian eksternal yang sudah diverifikasi."
                      className="mt-1 w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-slate-900 dark:text-white"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={pending || module.status !== 'active'}
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
