'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCheck, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import type { SubmissionWithDetails } from '@/features/challenges/queries';
import { ReviewForm } from '@/features/challenges/components/ReviewForm';
import { bulkApproveSubmissions } from '@/features/challenges/actions';

const STATUS_BADGE: Record<string, string> = {
  pending:        'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  approved:       'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  needs_revision: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const STATUS_LABEL: Record<string, string> = {
  pending:        'Menunggu Review',
  approved:       'Disetujui',
  needs_revision: 'Perlu Revisi',
};

interface TeacherSubmissionsClientProps {
  submissions: SubmissionWithDetails[];
}

export function TeacherSubmissionsClient({ submissions }: TeacherSubmissionsClientProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const pending = submissions.filter((s) => s.status === 'pending');
  const reviewed = submissions.filter((s) => s.status !== 'pending');

  const allPendingSelected = pending.length > 0 && pending.every((s) => selectedIds.includes(s.id));
  const somePendingSelected = selectedIds.length > 0 && !allPendingSelected;

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (allPendingSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pending.map((s) => s.id));
    }
  };

  const handleBulkApprove = () => {
    if (selectedIds.length === 0) return;

    startTransition(async () => {
      setMessage(null);
      const res = await bulkApproveSubmissions(selectedIds);
      if (res.success) {
        setMessage({ type: 'success', text: res.message });
        setSelectedIds([]);
        router.refresh();
      } else {
        setMessage({ type: 'error', text: res.error });
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header & Bulk Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Review Submissions</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {pending.length} menunggu review · {reviewed.length} sudah diproses
          </p>
        </div>

        {/* Bulk Approve Button at top */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBulkApprove}
            disabled={selectedIds.length === 0 || isPending}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm ${
              selectedIds.length > 0 && !isPending
                ? 'bg-green-700 hover:bg-green-800 text-white shadow-green-700/20 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700'
            }`}
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <CheckCheck className="w-4 h-4" />
            )}
            <span>
              {isPending
                ? 'Menyetujui...'
                : selectedIds.length > 0
                ? `Setujui Terpilih (${selectedIds.length})`
                : 'Setujui Terpilih (Bulk Approve)'}
            </span>
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          role="alert"
          className={`flex items-center justify-between gap-3 p-4 rounded-xl text-sm transition-all ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-600 dark:text-green-400" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600 dark:text-red-400" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pending Submissions Section */}
      <section>
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            Menunggu Review ({pending.length})
          </h2>

          {/* Quick Select All Toggle */}
          {pending.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allPendingSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = somePendingSelected;
                  }}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded text-indigo-600 border-slate-300 dark:border-slate-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span>
                  {allPendingSelected
                    ? 'Batal Pilih Semua'
                    : `Pilih Semua (${pending.length})`}
                </span>
              </label>
              {selectedIds.length > 0 && (
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md">
                  {selectedIds.length} dipilih
                </span>
              )}
            </div>
          )}
        </div>

        {pending.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl py-10 text-center text-slate-400 dark:text-slate-500 text-sm">
            Semua submission sudah diproses 🎉
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {pending.map((sub) => {
              const isSelected = selectedIds.includes(sub.id);

              return (
                <div
                  key={sub.id}
                  className={`border rounded-xl bg-white dark:bg-slate-900 transition-all overflow-hidden ${
                    isSelected
                      ? 'border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-400/40 dark:ring-indigo-600/40 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Card Header with Checkbox */}
                  <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Checkbox for selecting this submission */}
                        <div className="pt-0.5 flex-shrink-0">
                          <input
                            type="checkbox"
                            id={`sub-check-${sub.id}`}
                            checked={isSelected}
                            onChange={() => toggleSelect(sub.id)}
                            className="w-4 h-4 rounded text-indigo-600 border-slate-300 dark:border-slate-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </div>

                        <div className="min-w-0">
                          <label
                            htmlFor={`sub-check-${sub.id}`}
                            className="font-semibold text-slate-800 dark:text-slate-200 text-sm cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 block truncate"
                          >
                            {sub.challenge?.title ?? '—'}
                          </label>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {sub.student_name ?? '—'} · {sub.student_email ?? '—'}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                            Dikirim{' '}
                            {new Date(sub.submitted_at).toLocaleString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            STATUS_BADGE[sub.status]
                          }`}
                        >
                          {STATUS_LABEL[sub.status]}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="px-5 py-4 flex flex-col gap-3">
                    {/* Submission proof */}
                    {sub.submission_url ? (
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                          Bukti submission:
                        </p>
                        <a
                          href={sub.submission_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline break-all"
                        >
                          {sub.submission_url}
                        </a>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Tidak ada link submission.
                      </p>
                    )}

                    {/* Student note */}
                    {sub.submission_note && (
                      <div className="bg-slate-50 dark:bg-slate-800/60 rounded px-3 py-2 text-sm text-slate-600 dark:text-slate-300">
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          Catatan siswa:{' '}
                        </span>
                        {sub.submission_note}
                      </div>
                    )}

                    {/* Review form for manual / revision feedback */}
                    <ReviewForm submissionId={sub.id} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Reviewed history */}
      {reviewed.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3">
            Riwayat ({reviewed.length})
          </h2>
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            {reviewed.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between px-5 py-3 gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                    {sub.challenge?.title ?? '—'}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {sub.student_name ?? '—'} ·{' '}
                    {new Date(sub.submitted_at).toLocaleDateString('id-ID')}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${
                    STATUS_BADGE[sub.status]
                  }`}
                >
                  {STATUS_LABEL[sub.status]}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
