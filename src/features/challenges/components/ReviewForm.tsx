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
        <p className="text-sm text-green-700">{state.message}</p>
      )}
      {state && !state.success && (
        <p className="text-sm text-red-600 dark:text-rose-400" role="alert">{state.error}</p>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor={`note-${submissionId}`} className="text-sm font-medium">
          Catatan (wajib jika perlu revisi)
        </label>
        <textarea id={`note-${submissionId}`} name="review_note" rows={2}
          className="border rounded px-3 py-2 text-sm resize-y"
          placeholder="Jelaskan apa yang perlu diperbaiki..." />
      </div>

      <div className="flex gap-2">
        <button type="submit" name="status" value="approved" disabled={pending}
          className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded disabled:opacity-50">
          {pending ? '...' : '✓ Setujui'}
        </button>
        <button type="submit" name="status" value="needs_revision" disabled={pending}
          className="px-4 py-2 text-sm font-medium bg-amber-500 text-white rounded disabled:opacity-50">
          {pending ? '...' : 'Perlu Revisi'}
        </button>
      </div>
    </form>
  );
}
