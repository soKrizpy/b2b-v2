'use client';
// src/features/users/components/AddTeacherForm.tsx
import { useActionState, useEffect } from 'react';
import { createTeacher, type UserActionResult } from '../actions';

interface Props { onSuccess?: () => void }

export function AddTeacherForm({ onSuccess }: Props) {
  const [state, dispatch, pending] = useActionState(createTeacher, null);

  useEffect(() => { if (state?.success) onSuccess?.(); }, [state, onSuccess]);

  const err = (f: string) =>
    state && !state.success ? state.fields?.[f] : undefined;

  return (
    <form action={dispatch} className="flex flex-col gap-4">
      {state && !state.success && !state.fields && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 ring-1 ring-red-200">
          {state.error}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Full name */}
        <div className="flex flex-col gap-1">
          <label htmlFor="t-name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Nama Lengkap <span className="text-red-500">*</span>
          </label>
          <input id="t-name" name="full_name" required placeholder="Dewi Rahayu"
            className={`rounded-lg border px-3 py-2 text-sm
              bg-white dark:bg-white/5 text-slate-900 dark:text-white
              placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500
              ${err('full_name') ? 'border-red-400' : 'border-slate-300 dark:border-white/15'}`} />
          {err('full_name') && <p className="text-xs text-red-600">{err('full_name')}</p>}
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1">
          <label htmlFor="t-email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Email <span className="text-red-500">*</span>
          </label>
          <input id="t-email" name="email" type="email" required placeholder="guru@b2b.id"
            className={`rounded-lg border px-3 py-2 text-sm
              bg-white dark:bg-white/5 text-slate-900 dark:text-white
              placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500
              ${err('email') ? 'border-red-400' : 'border-slate-300 dark:border-white/15'}`} />
          {err('email') && <p className="text-xs text-red-600">{err('email')}</p>}
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label htmlFor="t-pw" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Password <span className="text-red-500">*</span>
          </label>
          <input id="t-pw" name="password" type="password" required minLength={8}
            placeholder="Minimal 8 karakter"
            className={`rounded-lg border px-3 py-2 text-sm
              bg-white dark:bg-white/5 text-slate-900 dark:text-white
              placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500
              ${err('password') ? 'border-red-400' : 'border-slate-300 dark:border-white/15'}`} />
          {err('password') && <p className="text-xs text-red-600">{err('password')}</p>}
          <p className="text-xs text-slate-500 dark:text-slate-400">Guru login menggunakan email + password ini</p>
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-white/8">
        <button type="submit" disabled={pending}
          className="px-5 py-2.5 text-sm font-bold rounded-xl text-white
            bg-violet-600 hover:bg-violet-700 disabled:opacity-50 transition-colors shadow-sm">
          {pending ? 'Menyimpan…' : '+ Tambah Guru'}
        </button>
      </div>
    </form>
  );
}
