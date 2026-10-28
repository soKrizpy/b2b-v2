'use client';
// src/app/admin/curriculum/ModuleAccordion.tsx
// Module card in the curriculum list.
// Actions: ✏️ Edit metadata (inline form), 🗑 Hapus, [Edit & Build >] → builder page.

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useActionState } from 'react';
import { deleteModule, updateModuleAction } from '@/features/curriculum/actions';
import type { ModuleWithTopics } from '@/features/curriculum/queries';

interface Props { module: ModuleWithTopics }

const LEVEL_LABELS: Record<string, string> = {
  beginner:     'Beginner',
  intermediate: 'Intermediate',
  advanced:     'Advanced',
};
const LEVEL_COLOR: Record<string, string> = {
  beginner:     'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-700/40',
  intermediate: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-700/40',
  advanced:     'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-700/40',
};

export function ModuleAccordion({ module: mod }: Props) {
  const router  = useRouter();
  const [showEdit, setShowEdit] = useState(false);
  const [pendingDel, startDel]  = useTransition();

  const [editState, editDispatch, editPending] = useActionState(updateModuleAction, null);

  useEffect(() => {
    if (editState?.success) { setShowEdit(false); router.refresh(); }
  }, [editState, router]);

  const handleDelete = () => {
    if (!confirm(`Hapus modul "${mod.title}" beserta semua topiknya?\nTindakan ini tidak dapat dibatalkan.`)) return;
    const fd = new FormData();
    fd.append('id', String(mod.id));
    startDel(async () => { await deleteModule(null, fd); router.refresh(); });
  };

  const hasFinalAssessment = (mod.description ?? '').startsWith('FINAL_ASSESSMENT:');
  const displayDesc = hasFinalAssessment ? null : mod.description;

  return (
    <div className={`relative bg-white dark:bg-[#0B0F19] rounded-2xl border-2 shadow-sm
      transition-all duration-300 ease-in-out hover:scale-[1.01] hover:shadow-md hover:z-10 overflow-hidden
      ${pendingDel ? 'opacity-50 pointer-events-none' : ''}
      ${showEdit
        ? 'border-indigo-400 dark:border-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.2)] dark:shadow-[0_0_25px_rgba(168,85,247,0.25)]'
        : 'border-blue-400/35 dark:border-purple-500/40 hover:border-blue-500 dark:hover:border-purple-400 dark:shadow-[0_0_20px_rgba(168,85,247,0.15)] dark:hover:shadow-[0_0_25px_rgba(168,85,247,0.25)]'}`}>

      {/* ── Card header ──────────────────────────────────────────────────── */}
      <div className="px-5 py-4 flex items-start gap-3">

        {/* Info */}
        <div className="flex-1 min-w-0">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ring-1
              ${LEVEL_COLOR[mod.level ?? 'beginner']}`}>
              {LEVEL_LABELS[mod.level ?? 'beginner'] ?? mod.level}
            </span>
            <span className="text-[10px] font-semibold bg-slate-100 dark:bg-white/10
              text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full ring-1
              ring-slate-200 dark:ring-white/15">
              {mod.topics.length} Topik
            </span>
            {hasFinalAssessment && (
              <span className="text-[10px] font-semibold bg-amber-50 dark:bg-amber-900/20
                text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full ring-1
                ring-amber-200 dark:ring-amber-700/40">
                🏆 Tryout
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug truncate">
            {mod.title}
          </h3>

          {/* Description (only when not overridden by final_assessment) */}
          {displayDesc && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
              {displayDesc}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
          {/* Edit metadata */}
          <button
            type="button"
            onClick={() => setShowEdit((v) => !v)}
            title="Edit metadata modul"
            className={`p-2 rounded-xl text-xs font-medium ring-1 transition-colors
              ${showEdit
                ? 'ring-indigo-300 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                : 'ring-slate-200 dark:ring-white/15 bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:ring-indigo-300 hover:text-indigo-600'
              }`}
          >
            ✏️
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={handleDelete}
            disabled={pendingDel}
            title="Hapus modul"
            className="p-2 rounded-xl text-xs font-medium ring-1 transition-colors
              ring-red-200 dark:ring-red-700/40 bg-red-50 dark:bg-red-900/20
              text-red-600 dark:text-red-400
              hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-40"
          >
            🗑
          </button>

          {/* Edit & Build — primary CTA */}
          <Link
            href={`/admin/curriculum/${mod.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold
              bg-slate-900 dark:bg-white text-white dark:text-slate-900
              hover:opacity-90 transition-opacity shadow-sm"
          >
            Edit &amp; Build
            <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
              <path d="M4.5 2L9 6l-4.5 4V2z"/>
            </svg>
          </Link>
        </div>
      </div>

      {/* ── Inline edit form ─────────────────────────────────────────────── */}
      {showEdit && (
        <div className="px-5 pb-5 pt-1 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3 mt-3">
            Edit Metadata Modul
          </p>

          {editState && !editState.success && (
            <p role="alert" className="text-xs text-red-700 dark:text-rose-300 bg-red-50 dark:bg-rose-950/50 rounded-lg px-3 py-2 mb-3 ring-1 ring-red-200 dark:ring-rose-800/60">
              {editState.error}
            </p>
          )}

          <form action={editDispatch} className="flex flex-col gap-3">
            <input type="hidden" name="id" value={mod.id} />

            <input type="hidden" name="gamification_type" value="mimo" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Title */}
              <div className="sm:col-span-2 flex flex-col gap-1">
                <label htmlFor={`mod-title-${mod.id}`}
                  className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Judul Modul
                </label>
                <input id={`mod-title-${mod.id}`} name="title" required
                  defaultValue={mod.title ?? ''}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm
                    bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100
                    focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-purple-500/50" />
              </div>

              {/* Level */}
              <div className="flex flex-col gap-1">
                <label htmlFor={`mod-level-${mod.id}`}
                  className="text-xs font-semibold text-slate-600 dark:text-slate-300">Level</label>
                <select id={`mod-level-${mod.id}`} name="level"
                  defaultValue={mod.level ?? 'beginner'}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm
                    bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100
                    focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-purple-500/50">
                  <option value="beginner" className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">Beginner</option>
                  <option value="intermediate" className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">Intermediate</option>
                  <option value="advanced" className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">Advanced</option>
                </select>
              </div>

              {/* Description */}
              <div className="sm:col-span-2 flex flex-col gap-1">
                <label htmlFor={`mod-desc-${mod.id}`}
                  className="text-xs font-semibold text-slate-600 dark:text-slate-300">Deskripsi</label>
                <textarea id={`mod-desc-${mod.id}`} name="description" rows={2}
                  defaultValue={hasFinalAssessment ? '' : (mod.description ?? '')}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm resize-y
                    bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100
                    focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-purple-500/50"
                  placeholder="Deskripsi singkat modul…" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setShowEdit(false)}
                className="px-4 py-2 text-sm rounded-lg ring-1 ring-slate-200 dark:ring-white/15
                  text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5">
                Batal
              </button>
              <button type="submit" disabled={editPending}
                className="px-4 py-2 text-sm font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700
                  text-white shadow-sm disabled:opacity-50 transition-colors">
                {editPending ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
