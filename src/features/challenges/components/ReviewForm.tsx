'use client';
import { useActionState } from 'react';
import { reviewSubmission } from '../actions';

interface Props { submissionId: number }

export function ReviewForm({ submissionId }: Props) {
  const [state, dispatch, pending] = useActionState(reviewSubmission, null);

  return (
    <form action={dispatch} className="flex flex-col gap-3">
      <input type="hidden" name="submission_id" value={submissionId} />

      {state?.success && (
        <p className="text-sm text-green-700 dark:text-green-300">{state.message}</p>
      )}
      {state && !state.success && (
        <p className="text-sm text-red-600 dark:text-rose-400" role="alert">{state.error}</p>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor={`note-${submissionId}`} className="text-sm font-medium">
          Catatan (wajib jika perlu revisi)
        </label>
        <textarea id={`note-${submissionId}`} name="review_note" rows={2}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-purple-500/50 focus:border-blue-500 dark:focus:border-purple-500 resize-y transition-colors"
          placeholder="Jelaskan apa yang perlu diperbaiki..." />
      </div>

      <div className="flex gap-2">
        <button type="submit" name="status" value="approved" disabled={pending}
          className="px-4 py-2 text-sm font-medium bg-green-700 hover:bg-green-800 text-white rounded disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900">
          {pending ? '...' : '✓ Setujui'}
        </button>
        <button type="submit" name="status" value="needs_revision" disabled={pending}
          className="px-4 py-2 text-sm font-medium bg-amber-700 hover:bg-amber-800 text-white rounded disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900">
          {pending ? '...' : 'Perlu Revisi'}
        </button>
      </div>
    </form>
  );
}
