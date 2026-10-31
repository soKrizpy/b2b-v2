'use client';
// src/features/users/components/AddStudentForm.tsx
import { useActionState, useEffect } from 'react';
import { createStudent, type UserActionResult } from '../actions';

interface Props { onSuccess?: () => void }

export function AddStudentForm({ onSuccess }: Props) {
  const [state, dispatch, pending] = useActionState(createStudent, null);

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
          <label htmlFor="s-name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Nama Lengkap <span className="text-red-500">*</span>
          </label>
          <input id="s-name" name="full_name" required placeholder="Budi Santoso"
            className={`rounded-lg border px-3 py-2 text-sm
              bg-white dark:bg-white/5 text-slate-900 dark:text-white
              placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7cc62f]
              ${err('full_name') ? 'border-red-400' : 'border-slate-300 dark:border-white/15'}`} />
          {err('full_name') && <p className="text-xs text-red-600">{err('full_name')}</p>}
        </div>

        {/* Contact */}
        <div className="flex flex-col gap-1">
          <label htmlFor="s-contact" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Email / No. WhatsApp <span className="text-red-500">*</span>
          </label>
          <input id="s-contact" name="contact" required placeholder="08123456789 atau siswa@email.com"
            className={`rounded-lg border px-3 py-2 text-sm
              bg-white dark:bg-white/5 text-slate-900 dark:text-white
              placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7cc62f]
              ${err('contact') ? 'border-red-400' : 'border-slate-300 dark:border-white/15'}`} />
          {err('contact') && <p className="text-xs text-red-600">{err('contact')}</p>}
        </div>

        {/* MPIN */}
        <div className="flex flex-col gap-1">
          <label htmlFor="s-mpin" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            6 Digit PIN <span className="text-red-500">*</span>
          </label>
          <input id="s-mpin" name="mpin" required maxLength={6} placeholder="123456"
            inputMode="numeric" pattern="\d{6}"
            className={`rounded-lg border px-3 py-2 text-sm font-mono tracking-widest
              bg-white dark:bg-white/5 text-slate-900 dark:text-white
              placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7cc62f]
              ${err('mpin') ? 'border-red-400' : 'border-slate-300 dark:border-white/15'}`} />
          {err('mpin') && <p className="text-xs text-red-600">{err('mpin')}</p>}
          <p className="text-xs text-slate-500 dark:text-slate-400">Siswa login menggunakan PIN ini</p>
        </div>

        {/* Grade */}
        <div className="flex flex-col gap-1">
          <label htmlFor="s-grade" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Kelas / Grade
          </label>
          <input id="s-grade" name="grade" placeholder="SD Kelas 4"
            className="rounded-lg border border-slate-300 dark:border-white/15 px-3 py-2 text-sm
              bg-white dark:bg-white/5 text-slate-900 dark:text-white
              placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7cc62f]" />
        </div>
      </div>

      {/* Bio */}
      <div className="flex flex-col gap-1">
        <label htmlFor="s-bio" className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Catatan / Bio
        </label>
        <textarea id="s-bio" name="bio" rows={2} placeholder="Catatan singkat tentang siswa…"
          className="rounded-lg border border-slate-300 dark:border-white/15 px-3 py-2 text-sm resize-y
            bg-white dark:bg-white/5 text-slate-900 dark:text-white
            placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7cc62f]" />
      </div>

      <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-white/8">
        <button type="submit" disabled={pending}
          className="px-5 py-2.5 text-sm font-bold rounded-xl text-white
            bg-[#7cc62f] hover:bg-[#5fa31f] disabled:opacity-50 transition-colors shadow-sm">
          {pending ? 'Menyimpan…' : '+ Tambah Siswa'}
        </button>
      </div>
    </form>
  );
}
