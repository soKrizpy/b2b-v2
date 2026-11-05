'use client';
// src/features/curriculum/components/CurriculumImportModal.tsx
// Accepts JSON via textarea paste OR .json file upload.
// Validates client-side first (Zod), then calls importCurriculumJson server action.
// Antigravity handles visual polish â€” keep markup semantic.

import { useCallback, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { curriculumJsonSchema } from '../validation';
import { importCurriculumJson, type CurriculumActionResult } from '../actions';

interface Props { onClose: () => void }

type ValidationState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'valid'; moduleCount: number; topicCount: number }
  | { status: 'importing' }
  | { status: 'done'; message: string; stats?: { modules: number; topics: number } };

export function CurriculumImportModal({ onClose }: Props) {
  const router             = useRouter();
  const fileInputRef       = useRef<HTMLInputElement>(null);
  const [text, setText]    = useState('');
  const [vs, setVs]        = useState<ValidationState>({ status: 'idle' });
  const [isPending, start] = useTransition();

  // â”€â”€ Client-side JSON parse + Zod validate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const validate = useCallback((raw: string): boolean => {
    if (!raw.trim()) { setVs({ status: 'error', message: 'JSON tidak boleh kosong.' }); return false; }

    let parsed: unknown;
    try { parsed = JSON.parse(raw); }
    catch { setVs({ status: 'error', message: 'JSON tidak valid: periksa sintaks (koma, kurung, tanda kutip).' }); return false; }

    const result = curriculumJsonSchema.safeParse(parsed);
    if (!result.success) {
      const flat   = result.error.flatten();
      const first  = flat.formErrors[0]
        ?? Object.entries(flat.fieldErrors).map(([k, v]) => `${k}: ${(v as string[])[0]}`)[0]
        ?? 'Struktur JSON tidak sesuai schema.';
      setVs({ status: 'error', message: first as string });
      return false;
    }

    const modules = result.data;
    const topicCount = modules.reduce((s, m) => s + m.topics.length, 0);
    setVs({ status: 'valid', moduleCount: modules.length, topicCount });
    return true;
  }, []);

  // â”€â”€ File upload handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      setVs({ status: 'error', message: 'Hanya file .json yang didukung.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setText(content);
      validate(content);
    };
    reader.readAsText(file);
  };

  // â”€â”€ Textarea change â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const onTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setVs({ status: 'idle' }); // reset until user clicks validate
  };

  const loadScratchTemplate = async () => {
    try {
      const res = await fetch('/curriculum/scratch-game-development.json');
      if (res.ok) {
        const jsonText = await res.text();
        setText(jsonText);
        validate(jsonText);
      }
    } catch {
      // ignore
    }
  };

  // â”€â”€ Submit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleImport = () => {
    if (!validate(text)) return;

    let payload: unknown;
    try { payload = JSON.parse(text); }
    catch { return; }

    setVs({ status: 'importing' });
    start(async () => {
      const result: CurriculumActionResult = await importCurriculumJson(payload);
      if (result.success) {
        setVs({ status: 'done', message: result.message, stats: result.stats });
        router.refresh();
      } else {
        setVs({ status: 'error', message: result.error });
      }
    });
  };

  const isImporting = vs.status === 'importing' || isPending;
  const isDone      = vs.status === 'done';

  return (
    /* Backdrop */
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-16 px-4"
      onClick={(e) => { if (e.target === e.currentTarget && !isImporting) onClose(); }}
    >
      <div className="w-full max-w-2xl bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 id="import-modal-title" className="font-semibold text-slate-900 dark:text-white">
            Import Kurikulum (JSON)
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-40 text-xl leading-none"
            aria-label="Tutup"
          >
            Ã—
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">

          {/* Schema hint */}
          <details className="text-xs text-slate-600 dark:text-slate-300 border border-[var(--border)] rounded-lg">
            <summary className="px-3 py-2 cursor-pointer font-medium select-none">
              Format JSON yang diharapkan (klik untuk lihat)
            </summary>
            <pre className="px-3 pb-3 pt-1 overflow-x-auto leading-relaxed text-slate-600 dark:text-slate-300">{`[
  {
    "module_title": "Nama Modul",
    "module_order": 1,
    "level": "beginner",
    "gamification_type": "mimo",
    "topics": [
      {
        "topic_title": "Nama Topik",
        "topic_order": 1,
        "nodes": [
          {
            "node_id": "node-1",
            "order": 0,
            "type": "theory",   // theory | quiz | challenge | code | practice
            "title": "Konsep Dasar",
            "content": "Penjelasan materi...",
            "xp": 10
          },
          {
            "node_id": "node-2",
            "order": 1,
            "type": "quiz",
            "title": "Pertanyaan Cepat",
            "content": "Apa itu HTML?",
            "options": ["Bahasa markup", "Bahasa pemrograman", "Database", "OS"],
            "correct_option": "Bahasa markup",
            "xp": 20
          }
        ]
      }
    ]
  }
]`}</pre>
          </details>

          {/* File upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Upload file .json
            </label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={onFile}
                className="sr-only"
                id="json-file-input"
                disabled={isImporting}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="px-4 py-2 text-sm border border-[var(--border)] bg-[var(--surface-raised)] text-slate-700 dark:text-slate-200 rounded-lg hover:bg-[var(--table-hover)] disabled:opacity-40"
              >
                Pilih File
              </button>
              <button
                type="button"
                onClick={loadScratchTemplate}
                disabled={isImporting}
                className="px-3.5 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800/50 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span>🎮</span> Muat Template Scratch (10 Topik & Kuis)
              </button>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                atau tempel JSON langsung
              </span>
            </div>
          </div>

          {/* Textarea */}
          <div>
            <label htmlFor="json-textarea" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              JSON Kurikulum
            </label>
            <textarea
              id="json-textarea"
              value={text}
              onChange={onTextChange}
              rows={12}
              disabled={isImporting}
              spellCheck={false}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] text-slate-900 dark:text-white px-3 py-2 text-xs font-mono resize-y
                focus:outline-none focus:ring-2 focus:ring-[var(--border-hover)] disabled:opacity-40"
              placeholder='[{ "module_title": "...", "module_order": 1, "topics": [] }]'
            />
          </div>

          {/* Validation / status feedback */}
          {vs.status === 'error' && (
            <div role="alert" className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              <span className="font-semibold">Error: </span>{vs.message}
            </div>
          )}

          {vs.status === 'valid' && (
            <div className="rounded-lg bg-green-50 dark:bg-emerald-950/30 border border-green-200 dark:border-emerald-800/50 px-4 py-3 text-sm text-green-700 dark:text-emerald-300">
              âœ“ JSON valid â€” <span className="font-semibold">{vs.moduleCount}</span> modul,{' '}
              <span className="font-semibold">{vs.topicCount}</span> topik siap diimpor.
            </div>
          )}

          {vs.status === 'importing' && (
            <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300">
              â³ Mengimpor ke databaseâ€¦
            </div>
          )}

          {vs.status === 'done' && (
            <div className="rounded-lg bg-green-50 dark:bg-emerald-950/30 border border-green-200 dark:border-emerald-800/50 px-4 py-3 text-sm text-green-700 dark:text-emerald-300">
              ðŸŽ‰ {vs.message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border)] gap-3">
          {isDone ? (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium bg-slate-900 dark:bg-purple-600 text-white rounded-lg"
            >
              Selesai
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => validate(text)}
                disabled={!text.trim() || isImporting}
                className="px-4 py-2 text-sm border border-[var(--border)] bg-[var(--surface-raised)] text-slate-700 dark:text-slate-200 rounded-lg hover:bg-[var(--table-hover)] disabled:opacity-40"
              >
                Validasi JSON
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isImporting}
                  className="px-4 py-2 text-sm border border-[var(--border)] bg-[var(--surface-raised)] text-slate-700 dark:text-slate-200 rounded-lg hover:bg-[var(--table-hover)] disabled:opacity-40"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={!text.trim() || isImporting}
                  className="px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white rounded-lg
                    hover:bg-indigo-700 disabled:opacity-40"
                >
                  {isImporting ? 'Mengimporâ€¦' : 'Import Sekarang'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

