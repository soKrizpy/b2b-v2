'use client';
import { useActionState } from 'react';
import { submitChallenge } from '../actions';
import type { ChallengeRow, SubmissionRow } from '@/types/database';

interface Props {
  challenge: ChallengeRow;
  existingSubmission: SubmissionRow | null;
  /** When true, hides the submission form (review-only mode for paused modules). */
  reviewOnly?: boolean;
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pending:        { label: 'Menunggu Review',  className: 'bg-amber-100 text-amber-800' },
  approved:       { label: 'Disetujui ✓',      className: 'bg-green-100 text-green-800' },
  needs_revision: { label: 'Perlu Revisi',     className: 'bg-red-100 text-red-800' },
};

export function SubmitChallengeForm({ challenge, existingSubmission, reviewOnly = false }: Props) {
  const [state, dispatch, pending] = useActionState(submitChallenge, null);

  const status = existingSubmission?.status;
  const isApproved = status === 'approved';
  const isPending  = status === 'pending';

  return (
    <div className="flex flex-col gap-3">
      {/* Status badge */}
      {status && (
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_LABEL[status]?.className}`}>
            {STATUS_LABEL[status]?.label}
          </span>
          {existingSubmission?.submission_url && (
            <a href={existingSubmission.submission_url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-indigo-600 underline">Lihat submission</a>
          )}
        </div>
      )}

      {/* Teacher feedback on revision request */}
      {status === 'needs_revision' && existingSubmission?.review_note && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <span className="font-semibold">Catatan guru: </span>
          {existingSubmission.review_note}
        </div>
      )}

      {/* Review-only notice for paused modules */}
      {reviewOnly && (
        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
          📖 Mode review — modul ini sedang dijeda. Pengiriman jawaban tidak tersedia.
        </p>
      )}

      {/* Success message */}
      {state?.success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          {state.message}
        </p>
      )}

      {/* Error message */}
      {state && !state.success && (
        <p className="text-sm text-red-600" role="alert">{state.error}</p>
      )}

      {/* Form — hidden when approved, pending, or in review-only mode */}
      {!isApproved && !isPending && !reviewOnly && (
        <form action={dispatch} className="flex flex-col gap-3">
          <input type="hidden" name="challenge_id" value={challenge.id} />

          <div className="flex flex-col gap-1">
            <label htmlFor={`url-${challenge.id}`} className="text-sm font-medium">
              {challenge.allows_file_upload
                ? 'Link atau URL file upload'
                : 'Link bukti pengerjaan'}
            </label>
            <input id={`url-${challenge.id}`} name="submission_url" type="url"
              required className="border rounded px-3 py-2 text-sm"
              placeholder="https://scratch.mit.edu/projects/..." />
            {state && !state.success && state.fields?.submission_url && (
              <p className="text-xs text-red-600">{state.fields.submission_url}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={`note-${challenge.id}`} className="text-sm font-medium">
              Catatan (opsional)
            </label>
            <textarea id={`note-${challenge.id}`} name="submission_note" rows={2}
              className="border rounded px-3 py-2 text-sm resize-y"
              placeholder="Ceritakan apa yang kamu buat..." />
          </div>

          <button type="submit" disabled={pending}
            className="self-start px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded disabled:opacity-50">
            {pending ? 'Mengirim...' : status === 'needs_revision' ? 'Kirim Ulang' : 'Kirim Jawaban'}
          </button>
        </form>
      )}

      {isPending && (
        <p className="text-sm text-slate-500">Submission sedang diproses — tidak dapat mengirim ulang.</p>
      )}
    </div>
  );
}
