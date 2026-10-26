'use client';
// src/app/admin/curriculum/CurriculumShell.tsx
// Owns the "Buat Modul Baru" modal on the module list page.
// Import/Export JSON is now per-module, handled in /admin/curriculum/[moduleId].

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createModuleAction } from '@/features/curriculum/actions';

interface Props { children: React.ReactNode }

export function CurriculumShell({ children }: Props) {
  const router              = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [state, dispatch, pending]  = useActionState(createModuleAction, null);

  useEffect(() => {
    if (state?.success) { setShowCreate(false); router.refresh(); }
  }, [state, router]);

  return (
    <>
      {/* ── Top toolbar: only "Buat Modul Baru" ─────────────────────────── */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold
            bg-slate-900 dark:bg-white text-white dark:text-slate-900
            rounded-xl shadow-sm hover:opacity-90 active:scale-95 transition-all"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"/>
          </svg>
          Buat Modul Baru
        </button>
      </div>

      {/* Module list (server-rendered) */}
      {children}

      {/* ── Create Module Modal ──────────────────────────────────────────── */}
      {showCreate && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-module-title"
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/60 backdrop-blur-sm p-3 sm:p-5"
          onClick={(e) => { if (e.target === e.currentTarget && !pending) setShowCreate(false); }}
        >
          <div className="w-full max-w-md bg-white dark:bg-[#0B0F19] rounded-2xl shadow-2xl border-2 border-blue-400/50 dark:border-purple-500/40 dark:shadow-[0_0_35px_rgba(168,85,247,0.22)] dark:ring-1 dark:ring-purple-500/35 overflow-hidden flex flex-col min-h-0 max-h-[calc(100dvh-1.5rem)]">

            {/* Header */}
            <div className="shrink-0 px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0F19] flex items-center justify-between">
              <h2 id="create-module-title" className="font-bold text-slate-900 dark:text-white text-base">
                Buat Modul Baru
              </h2>
              <button type="button" onClick={() => setShowCreate(false)} disabled={pending}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-2xl leading-none disabled:opacity-40"
                aria-label="Tutup">×</button>
            </div>

            {/* Form */}
            <form action={dispatch} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 flex flex-col gap-4">

              {state && !state.success && (
                <p role="alert" className="text-sm text-red-600 dark:text-rose-300 bg-red-50 dark:bg-rose-950/40 px-3 py-2.5 rounded-xl ring-1 ring-red-200 dark:ring-rose-800/50">
                  {state.error}
                </p>
              )}

              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="new-mod-title" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Judul Modul <span className="text-red-500">*</span>
                </label>
                <input id="new-mod-title" name="title" required autoFocus
                  placeholder="contoh: Pengenalan HTML & CSS"
                  className={`rounded-xl border px-3.5 py-2.5 text-sm
                    bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100
                    placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-purple-500/50
                    ${state && !state.success && state.fields?.title
                      ? 'border-red-400'
                      : 'border-slate-300 dark:border-purple-500/40'}`} />
                {state && !state.success && state.fields?.title && (
                  <p className="text-xs text-red-600 dark:text-red-400">{state.fields.title}</p>
                )}
              </div>

              {/* Hardcoded gamification type — not exposed to user */}
              <input type="hidden" name="gamification_type" value="mimo" />

              {/* Level */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="new-mod-level" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Level
                </label>
                <select id="new-mod-level" name="level" defaultValue="beginner"
                  className="rounded-xl border border-slate-300 dark:border-purple-500/40 px-3.5 py-2.5 text-sm
                    bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100
                    focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-purple-500/50">
                  <option value="beginner" className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">Beginner</option>
                  <option value="intermediate" className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">Intermediate</option>
                  <option value="advanced" className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">Advanced</option>
                </select>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="new-mod-desc" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Deskripsi <span className="text-slate-400 dark:text-slate-500 font-normal">(opsional)</span>
                </label>
                <textarea id="new-mod-desc" name="description" rows={3}
                  placeholder="Deskripsi singkat isi modul ini…"
                  className="rounded-xl border border-slate-300 dark:border-purple-500/40 px-3.5 py-2.5 text-sm resize-y
                    bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100
                    placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-purple-500/50" />
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-white/8">
                <button type="button" onClick={() => setShowCreate(false)} disabled={pending}
                  className="px-4 py-2.5 text-sm rounded-xl ring-1 ring-slate-200 dark:ring-white/15
                    text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5
                    disabled:opacity-40 transition-colors">
                  Batal
                </button>
                <button type="submit" disabled={pending}
                  className="px-5 py-2.5 text-sm font-bold rounded-xl text-white
                    bg-slate-900 dark:bg-white dark:text-slate-900
                    hover:opacity-90 disabled:opacity-50 transition-all shadow-sm">
                  {pending ? 'Membuat…' : '+ Buat Modul'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
