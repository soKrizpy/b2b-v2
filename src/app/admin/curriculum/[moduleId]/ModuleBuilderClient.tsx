'use client';
// Module-scoped Import/Export toolbar + per-topic Preview & Edit panel.
import { useState, useTransition, useRef, useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  exportCurriculumJson,
  importCurriculumJsonForModule,
  deleteTopic,
  updateTopicAction,
  type CurriculumActionResult,
} from '@/features/curriculum/actions';
import type { ModuleWithTopics } from '@/features/curriculum/queries';
import type { TopicRow } from '@/types/database';
import { moduleImportSchema } from '@/features/curriculum/validation';
import { AiCurriculumGenerator } from '@/features/ai/components/AiCurriculumGenerator';

interface Props { module: ModuleWithTopics }

// ── Type helpers ──────────────────────────────────────────────────────────────

type LearningNode = {
  id?: string;
  type: string;
  title: string;
  xp?: number;
  explanation?: string;
  content?: string;
  instructions?: string;
  options?: string[];
  correctOption?: string;
  code?: { language: string; content: string };
};

type QuizQuestion = {
  question: string;
  options: string[];
  answer_index: number;
  explanation: string;
};

type PanelMode = 'preview' | 'edit';

function getNodeCount(lessonContent: unknown): number {
  if (!lessonContent || typeof lessonContent !== 'object') return 0;
  const learningPath = (lessonContent as Record<string, unknown>).learningPath;
  return Array.isArray(learningPath) ? learningPath.length : 0;
}

const NODE_TYPE_LABEL: Record<string, { label: string; color: string }> = {
  theory:    { label: 'Teori',     color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-blue-200 dark:ring-blue-700/40' },
  lesson:    { label: 'Teori',     color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-blue-200 dark:ring-blue-700/40' },
  quiz:      { label: 'Quiz',      color: 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 ring-violet-200 dark:ring-violet-700/40' },
  challenge: { label: 'Challenge', color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 ring-amber-200 dark:ring-amber-700/40' },
  code:      { label: 'Kode',      color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-700/40' },
  practice:  { label: 'Latihan',   color: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 ring-orange-200 dark:ring-orange-700/40' },
};

// ── Sub-components ────────────────────────────────────────────────────────────

/** Full topic preview: nodes list + quiz questions */
function TopicPreviewPanel({ topic }: { topic: TopicRow }) {
  const lc          = topic.lesson_content as Record<string, unknown> | null;
  const nodes       = (Array.isArray(lc?.learningPath) ? lc!.learningPath : []) as LearningNode[];
  const quizQuestions = (Array.isArray(lc?.quiz) ? lc!.quiz : []) as QuizQuestion[];
  const [expandedNode, setExpandedNode] = useState<number | null>(null);
  const [expandedQ,    setExpandedQ]    = useState<number | null>(null);

  if (nodes.length === 0 && quizQuestions.length === 0) {
    return (
      <div className="px-4 pb-4 pt-2">
        <p className="text-xs text-slate-400 dark:text-slate-500 italic">
          Topik ini belum memiliki node atau quiz. Import JSON untuk menambahkan materi.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-4 pt-1 flex flex-col gap-4">

      {/* Nodes */}
      {nodes.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">
            {nodes.length} Node Materi
          </p>
          <ol className="flex flex-col gap-1.5">
            {nodes.map((node, idx) => {
              const cfg  = NODE_TYPE_LABEL[node.type] ?? { label: node.type, color: 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 ring-slate-200 dark:ring-white/15' };
              const open = expandedNode === idx;
              const body = node.explanation || node.content || node.instructions;

              return (
                <li key={node.id ?? idx}>
                  <button
                    type="button"
                    onClick={() => setExpandedNode(open ? null : idx)}
                    className="w-full text-left flex items-start gap-2 px-3 py-2.5 rounded-xl
                      bg-slate-50 dark:bg-white/5 ring-1 ring-slate-200 dark:ring-white/10
                      hover:ring-slate-300 dark:hover:ring-white/20 transition-all"
                  >
                    <span className="text-slate-300 dark:text-slate-600 tabular-nums text-[10px] w-4 text-right mt-0.5 flex-shrink-0">
                      {idx + 1}.
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ring-1 flex-shrink-0 ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <span className="flex-1 text-xs font-medium text-slate-700 dark:text-slate-200 text-left min-w-0 truncate">
                      {node.title}
                    </span>
                    {typeof node.xp === 'number' && node.xp > 0 && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 flex-shrink-0">+{node.xp}XP</span>
                    )}
                    <span className="text-slate-400 text-[10px] flex-shrink-0">{open ? '▲' : '▼'}</span>
                  </button>

                  {open && (
                    <div className="ml-6 mt-1 rounded-xl bg-white dark:bg-[var(--surface)]
                      ring-1 ring-slate-200 dark:ring-white/10 px-4 py-3 space-y-2.5">
                      {body && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
                            Konten
                          </p>
                          <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                            {body}
                          </p>
                        </div>
                      )}
                      {Array.isArray(node.options) && node.options.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
                            Pilihan Jawaban
                          </p>
                          <ol className="flex flex-col gap-1">
                            {node.options.map((opt, oi) => (
                              <li key={oi}
                                className={`text-xs px-3 py-1.5 rounded-lg ring-1
                                  ${opt === node.correctOption
                                    ? 'ring-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 font-semibold'
                                    : 'ring-slate-200 dark:ring-white/10 text-slate-600 dark:text-slate-300'
                                  }`}>
                                <span className="font-bold text-slate-400 mr-1.5">{['A','B','C','D'][oi]}.</span>
                                {opt}
                                {opt === node.correctOption && (
                                  <span className="ml-2 text-[10px] text-emerald-600 dark:text-emerald-400">✓ Benar</span>
                                )}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                      {node.code && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
                            Kode ({node.code.language})
                          </p>
                          <pre className="text-xs font-mono bg-slate-900 dark:bg-black/60 text-emerald-400 p-3 rounded-lg overflow-x-auto">
                            {node.code.content}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Quiz questions */}
      {quizQuestions.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">
            {quizQuestions.length} Soal Quiz
          </p>
          <ol className="flex flex-col gap-1.5">
            {quizQuestions.map((q, qi) => {
              const open = expandedQ === qi;
              return (
                <li key={qi}>
                  <button
                    type="button"
                    onClick={() => setExpandedQ(open ? null : qi)}
                    className="w-full text-left flex items-start gap-2 px-3 py-2.5 rounded-xl
                      bg-violet-50/60 dark:bg-violet-900/10 ring-1 ring-violet-200 dark:ring-violet-700/30
                      hover:ring-violet-300 dark:hover:ring-violet-600/50 transition-all"
                  >
                    <span className="text-violet-400 tabular-nums text-[10px] w-4 text-right mt-0.5 flex-shrink-0">
                      {qi + 1}.
                    </span>
                    <span className="flex-1 text-xs font-medium text-slate-700 dark:text-slate-200 text-left min-w-0 truncate">
                      {q.question}
                    </span>
                    <span className="text-violet-400 dark:text-violet-500 text-[10px] flex-shrink-0">
                      {open ? '▲' : '▼'}
                    </span>
                  </button>

                  {open && (
                    <div className="ml-6 mt-1 rounded-xl bg-white dark:bg-[var(--surface)]
                      ring-1 ring-slate-200 dark:ring-white/10 px-4 py-3 space-y-2.5">
                      <ol className="flex flex-col gap-1">
                        {q.options.map((opt, oi) => (
                          <li key={oi}
                            className={`text-xs px-3 py-1.5 rounded-lg ring-1
                              ${oi === q.answer_index
                                ? 'ring-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 font-semibold'
                                : 'ring-slate-200 dark:ring-white/10 text-slate-600 dark:text-slate-300'
                              }`}>
                            <span className="font-bold text-slate-400 mr-1.5">{['A','B','C','D'][oi]}.</span>
                            {opt}
                            {oi === q.answer_index && (
                              <span className="ml-2 text-[10px] text-emerald-600 dark:text-emerald-400">✓ Kunci</span>
                            )}
                          </li>
                        ))}
                      </ol>
                      {q.explanation && (
                        <div className="bg-amber-50 dark:bg-amber-900/15 rounded-lg px-3 py-2
                          ring-1 ring-amber-200 dark:ring-amber-700/30">
                          <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mb-0.5">💡 Penjelasan</p>
                          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}

/** Inline edit form for a single topic */
function TopicEditForm({
  topic,
  moduleId,
  onClose,
}: {
  topic: TopicRow;
  moduleId: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, dispatch, pending] = useActionState(updateTopicAction, null);

  useEffect(() => {
    if (state?.success) { onClose(); router.refresh(); }
  }, [state, onClose, router]);

  const err = (f: string) => (state && !state.success ? state.fields?.[f] : undefined);

  return (
    <form action={dispatch} className="px-4 pb-4 pt-1 flex flex-col gap-3">
      <input type="hidden" name="id"        value={topic.id} />
      <input type="hidden" name="module_id" value={moduleId} />

      {state && !state.success && !state.fields && (
        <p role="alert" className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20
          rounded-lg px-3 py-2 ring-1 ring-red-200 dark:ring-red-700/40">
          {state.error}
        </p>
      )}

      {/* Title + order side by side */}
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Judul Topik *
          </label>
          <input name="title" required defaultValue={topic.title}
            className={`rounded-xl border px-3 py-2 text-sm bg-white dark:bg-white/5
              text-slate-900 dark:text-white placeholder:text-slate-400
              focus:outline-none focus:ring-2 focus:ring-indigo-500
              ${err('title') ? 'border-red-400' : 'border-slate-300 dark:border-white/15'}`} />
          {err('title') && <p className="text-xs text-red-600">{err('title')}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Urutan
          </label>
          <input name="order_index" type="number" min={0} defaultValue={topic.order_index}
            className="w-20 rounded-xl border border-slate-300 dark:border-white/15 px-3 py-2 text-sm
              bg-white dark:bg-white/5 text-slate-900 dark:text-white
              focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>

      {/* Status */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Status
        </label>
        <select name="status" defaultValue={topic.status ?? 'draft'}
          className="rounded-xl border border-slate-300 dark:border-white/15 px-3 py-2 text-sm
            bg-white dark:bg-[var(--surface)] text-slate-900 dark:text-white
            focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="draft">○ Draft — tidak terlihat siswa</option>
          <option value="published" disabled={getNodeCount(topic.lesson_content) === 0}>
            ● Published — terlihat siswa
          </option>
        </select>
        {getNodeCount(topic.lesson_content) === 0 && (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Tambahkan minimal satu node materi sebelum topik dapat dipublikasikan.
          </p>
        )}
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Deskripsi / Instruksi
        </label>
        <textarea name="description" rows={3} defaultValue={topic.description ?? ''}
          placeholder="Instruksi atau deskripsi topik ini…"
          className="rounded-xl border border-slate-300 dark:border-white/15 px-3 py-2 text-sm resize-y
            bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400
            focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>

      {/* Project link */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Link Project (opsional)
        </label>
        <input name="project_link" type="url" defaultValue={topic.project_link ?? ''}
          placeholder="https://scratch.mit.edu/projects/..."
          className="rounded-xl border border-slate-300 dark:border-white/15 px-3 py-2 text-sm
            bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400
            focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1
        border-t border-slate-100 dark:border-white/8">
        <button type="button" onClick={onClose}
          className="px-4 py-2 text-sm rounded-xl ring-1 ring-slate-200 dark:ring-white/15
            text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
          Batal
        </button>
        <button type="submit" disabled={pending}
          className="px-5 py-2 text-sm font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700
            text-white disabled:opacity-50 transition-colors shadow-sm">
          {pending ? 'Menyimpan…' : 'Simpan Perubahan'}
        </button>
      </div>
    </form>
  );
}

// ── Import state type ─────────────────────────────────────────────────────────

type ImportState =
  | { status: 'idle' }
  | { status: 'error'; msg: string }
  | { status: 'valid'; topicCount: number }
  | { status: 'importing' }
  | { status: 'done'; msg: string };

// ── Main component ────────────────────────────────────────────────────────────

export function ModuleBuilderClient({ module: mod }: Props) {
  const router = useRouter();

  // Import JSON state
  const [showImport, setShowImport] = useState(false);
  const [text, setText]             = useState('');
  const [vs, setVs]                 = useState<ImportState>({ status: 'idle' });
  const [exporting, startExport]    = useTransition();
  const [importPending, startImport]= useTransition();
  const [delPending, startDel]      = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Per-topic panel state: topicId → 'preview' | 'edit' | null
  const [activePanel, setActivePanel] = useState<Record<number, PanelMode | null>>({});

  const togglePanel = (topicId: number, mode: PanelMode) => {
    setActivePanel((prev) => {
      const current = prev[topicId];
      return { ...prev, [topicId]: current === mode ? null : mode };
    });
  };

  // ── Validate JSON ───────────────────────────────────────────────────────
  const validate = (raw: string): boolean => {
    if (!raw.trim()) { setVs({ status: 'error', msg: 'JSON tidak boleh kosong.' }); return false; }
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch {
      setVs({ status: 'error', msg: 'JSON tidak valid — periksa sintaks.' }); return false;
    }
    const toCheck = Array.isArray(parsed) ? parsed[0] : parsed;
    const result  = moduleImportSchema.safeParse(
      typeof toCheck === 'object' && toCheck !== null
        ? { module_title: 'dummy', module_order: 0, ...(toCheck as object) }
        : toCheck
    );
    if (!result.success) {
      const e   = result.error.flatten();
      const msg = e.formErrors[0] ?? Object.values(e.fieldErrors)[0]?.[0] ?? 'Struktur JSON tidak sesuai schema.';
      setVs({ status: 'error', msg: msg as string }); return false;
    }
    setVs({ status: 'valid', topicCount: result.data.topics.length }); return true;
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { const c = ev.target?.result as string; setText(c); validate(c); };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!validate(text)) return;
    let payload: unknown;
    try { payload = JSON.parse(text); } catch { return; }
    setVs({ status: 'importing' });
    startImport(async () => {
      const r = await importCurriculumJsonForModule(mod.id, payload);
      if (r.success) { setVs({ status: 'done', msg: r.message }); router.refresh(); }
      else setVs({ status: 'error', msg: r.error });
    });
  };

  const handleExport = () => {
    startExport(async () => {
      const r = await exportCurriculumJson();
      if (!r.success) return;
      const all    = r.data as Array<{ module_title: string }>;
      const single = all.find((m) => m.module_title === mod.title) ?? all[0];
      if (!single) return;
      const blob = new Blob([JSON.stringify(single, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `module-${mod.id}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const handleDelTopic = (topicId: number, title: string) => {
    if (!confirm(`Hapus topik "${title}"?`)) return;
    const fd = new FormData();
    fd.append('id', String(topicId));
    startDel(async () => { await deleteTopic(null, fd); router.refresh(); });
  };

  const getQuizCount = (lc: unknown): number => {
    if (!lc || typeof lc !== 'object') return 0;
    const q = (lc as Record<string, unknown>).quiz;
    return Array.isArray(q) ? q.length : 0;
  };

  const isImporting = vs.status === 'importing' || importPending;

  return (
    <div className="flex flex-col gap-5">

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <button type="button" onClick={() => setShowImport(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold
            bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm
            active:scale-95 transition-all">
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
            <path d="M7.47 1.47a.75.75 0 011.06 0l3.75 3.75a.75.75 0 01-1.06 1.06L8.75 3.81V10.5a.75.75 0 01-1.5 0V3.81L4.78 6.28a.75.75 0 01-1.06-1.06l3.75-3.75z"/>
            <path d="M3.5 13.5a.75.75 0 000 1.5h9a.75.75 0 000-1.5h-9z"/>
          </svg>
          Import JSON Materi
        </button>

        <button type="button" onClick={handleExport} disabled={exporting}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold
            ring-1 ring-slate-200 dark:ring-white/15 bg-white dark:bg-white/5
            text-slate-700 dark:text-slate-300 rounded-xl shadow-sm
            hover:bg-slate-50 dark:hover:bg-white/10 disabled:opacity-40 transition-all">
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
            <path d="M7.47 12.78a.75.75 0 001.06 0l3.75-3.75a.75.75 0 00-1.06-1.06L8.75 10.44V3.75a.75.75 0 00-1.5 0v6.69L4.78 7.97a.75.75 0 00-1.06 1.06l3.75 3.75z"/>
            <path d="M3.5 14.25a.75.75 0 000 1.5h9a.75.75 0 000-1.5h-9z"/>
          </svg>
          {exporting ? 'Mengekspor…' : 'Export JSON'}
        </button>

        {/* AI Curriculum Generator */}
        <AiCurriculumGenerator
          moduleTitle={mod.title ?? 'Modul'}
          onGenerated={(json) => {
            setText(json);
            setShowImport(true);
            validate(json);
          }}
        />
      </div>

      {/* ── Topic list ───────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
          Topik ({mod.topics.length})
        </h2>

        {mod.topics.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl
            border-2 border-dashed border-slate-200 dark:border-white/10
            bg-white dark:bg-white/3 py-12 text-center">
            <p className="text-slate-400 dark:text-slate-500 text-sm">
              Belum ada topik. Import JSON di atas untuk menambahkan materi.
            </p>
          </div>
        ) : (
          <div className={`flex flex-col gap-2 ${delPending ? 'opacity-60 pointer-events-none' : ''}`}>
            {mod.topics.map((topic) => {
              const nodeCount = getNodeCount(topic.lesson_content);
              const quizCount = getQuizCount(topic.lesson_content);
              const panel     = activePanel[topic.id] ?? null;

              return (
                <div key={topic.id}
                  className={`bg-white dark:bg-[var(--surface)] rounded-2xl ring-1 overflow-hidden
                    transition-all duration-200
                    ${panel === 'edit'
                      ? 'ring-indigo-300 dark:ring-indigo-600/50'
                      : panel === 'preview'
                      ? 'ring-slate-300 dark:ring-white/20'
                      : 'ring-slate-200 dark:ring-white/10'
                    }`}>

                  {/* ── Topic header row ──────────────────────────────── */}
                  <div className="px-4 py-3.5 flex items-start justify-between gap-3">

                    {/* Info */}
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <span className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/40
                        text-indigo-700 dark:text-indigo-300 text-xs font-bold
                        flex items-center justify-center flex-shrink-0 mt-0.5">
                        {topic.order_index}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-white text-sm leading-snug">
                          {topic.title}
                        </p>
                        {topic.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                            {topic.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {/* Status */}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ring-1
                            ${topic.status === 'published'
                              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 ring-green-300 dark:ring-green-600/50'
                              : 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 ring-amber-300 dark:ring-amber-600/50'
                            }`}>
                            {topic.status === 'published' ? '● Published · Terlihat siswa' : '○ Draft · Tersembunyi'}
                          </span>
                          {/* Node count */}
                          {nodeCount > 0 && (
                            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400
                              bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-full ring-1
                              ring-slate-200 dark:ring-white/15">
                              {nodeCount} node
                            </span>
                          )}
                          {/* Quiz count */}
                          {quizCount > 0 && (
                            <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-300
                              bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded-full ring-1
                              ring-violet-200 dark:ring-violet-700/40">
                              📝 {quizCount} soal
                            </span>
                          )}
                          {/* Project link */}
                          {topic.project_link && (
                            <a href={topic.project_link} target="_blank" rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400
                                hover:underline flex items-center gap-0.5">
                              🔗 Link
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                      {/* Preview */}
                      <button type="button"
                        onClick={() => togglePanel(topic.id, 'preview')}
                        title="Pratinjau konten"
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold ring-1 transition-all
                          ${panel === 'preview'
                            ? 'ring-slate-400 bg-slate-100 dark:bg-white/15 text-slate-800 dark:text-white'
                            : 'ring-slate-200 dark:ring-white/15 bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:ring-slate-300 dark:hover:ring-white/25'
                          }`}>
                        {panel === 'preview' ? '▲ Tutup' : '👁 Preview'}
                      </button>

                      {/* Edit */}
                      <button type="button"
                        onClick={() => togglePanel(topic.id, 'edit')}
                        title="Edit metadata topik"
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold ring-1 transition-all
                          ${panel === 'edit'
                            ? 'ring-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-200'
                            : 'ring-slate-200 dark:ring-white/15 bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:ring-indigo-300 dark:hover:ring-indigo-600/60'
                          }`}>
                        ✏️ Edit
                      </button>

                      {/* Delete */}
                      <button type="button"
                        onClick={() => handleDelTopic(topic.id, topic.title)}
                        title="Hapus topik"
                        className="p-1.5 rounded-xl text-xs ring-1 ring-red-200 dark:ring-red-700/40
                          bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400
                          hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                        🗑
                      </button>
                    </div>
                  </div>

                  {/* ── Preview panel ──────────────────────────────────── */}
                  {panel === 'preview' && (
                    <div className="border-t border-slate-100 dark:border-white/8 bg-slate-50/40 dark:bg-white/2">
                      <TopicPreviewPanel topic={topic as unknown as TopicRow} />
                    </div>
                  )}

                  {/* ── Edit panel ─────────────────────────────────────── */}
                  {panel === 'edit' && (
                    <div className="border-t border-indigo-100 dark:border-indigo-700/30 bg-indigo-50/30 dark:bg-indigo-900/10">
                      <TopicEditForm
                        topic={topic as unknown as TopicRow}
                        moduleId={mod.id}
                        onClose={() => setActivePanel((prev) => ({ ...prev, [topic.id]: null }))}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Import modal ─────────────────────────────────────────────────── */}
      {showImport && (
        <div role="dialog" aria-modal="true" aria-labelledby="import-modal-title"
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm pt-12 px-4"
          onClick={(e) => { if (e.target === e.currentTarget && !isImporting) setShowImport(false); }}>
          <div className="w-full max-w-2xl bg-white dark:bg-[var(--surface)] rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">

            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/8 flex items-center justify-between">
              <div>
                <h2 id="import-modal-title" className="font-bold text-slate-900 dark:text-white">
                  Import JSON Materi
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Modul: <strong className="text-slate-700 dark:text-slate-200">{mod.title}</strong>
                </p>
              </div>
              <button type="button" onClick={() => setShowImport(false)} disabled={isImporting}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-2xl leading-none disabled:opacity-40"
                aria-label="Tutup">×</button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">

              <details className="text-xs border border-slate-200 dark:border-white/10 rounded-xl">
                <summary className="px-4 py-3 cursor-pointer font-semibold text-slate-700 dark:text-slate-300 select-none hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl">
                  Format JSON yang diharapkan (klik untuk lihat)
                </summary>
                <pre className="px-4 pb-4 pt-2 overflow-x-auto text-[11px] font-mono text-slate-500 dark:text-slate-400 leading-relaxed">{`{
  "topics": [
    {
      "topic_title": "Nama Topik",
      "topic_order": 1,
      "nodes": [
        { "node_id": "n1", "order": 0, "type": "theory", "title": "Materi", "content": "...", "xp": 10 }
      ],
      "quiz": [
        { "question": "Pertanyaan?", "options": ["A","B","C","D"], "answer_index": 0, "explanation": "..." }
      ]
    }
  ],
  "final_assessment": {
    "title": "Tryout Akhir", "duration_minutes": 30,
    "questions": [ /* tepat 20 soal dengan format sama seperti quiz */ ]
  }
}`}</pre>
              </details>

              <div className="flex items-center gap-3">
                <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={onFile}
                  className="sr-only" id="builder-file-input" disabled={isImporting} />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isImporting}
                  className="px-4 py-2 text-sm font-medium border border-slate-300 dark:border-white/15
                    rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40
                    text-slate-700 dark:text-slate-300 transition-colors">
                  📁 Pilih File .json
                </button>
                <span className="text-xs text-slate-400 dark:text-slate-500">atau tempel JSON di bawah</span>
              </div>

              <textarea value={text} onChange={(e) => { setText(e.target.value); setVs({ status: 'idle' }); }}
                rows={13} disabled={isImporting} spellCheck={false}
                placeholder='{ "topics": [...], "final_assessment": { ... } }'
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 px-3.5 py-3
                  text-xs font-mono resize-y bg-white dark:bg-white/5 text-slate-900 dark:text-white
                  placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
                  disabled:opacity-40" />

              {vs.status === 'error'    && <div role="alert" className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 rounded-xl px-4 py-3"><strong>Error: </strong>{vs.msg}</div>}
              {vs.status === 'valid'    && <div className="text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/40 rounded-xl px-4 py-3">✓ JSON valid — <strong>{vs.topicCount}</strong> topik siap diimpor ke modul ini.</div>}
              {vs.status === 'importing'&& <div className="text-sm text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700/40 rounded-xl px-4 py-3">⏳ Mengimpor…</div>}
              {vs.status === 'done'     && <div className="text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/40 rounded-xl px-4 py-3">🎉 {vs.msg}</div>}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-white/8 flex items-center justify-between gap-3">
              {vs.status === 'done' ? (
                <button type="button" onClick={() => { setShowImport(false); setVs({ status: 'idle' }); setText(''); }}
                  className="px-5 py-2.5 text-sm font-bold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900">
                  Selesai
                </button>
              ) : (
                <>
                  <button type="button" onClick={() => validate(text)}
                    disabled={!text.trim() || isImporting}
                    className="px-4 py-2.5 text-sm font-medium border border-slate-300 dark:border-white/15
                      rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40
                      text-slate-700 dark:text-slate-300 transition-colors">
                    Validasi JSON
                  </button>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowImport(false)} disabled={isImporting}
                      className="px-4 py-2.5 text-sm border border-slate-300 dark:border-white/15 rounded-xl
                        hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40
                        text-slate-700 dark:text-slate-300 transition-colors">
                      Batal
                    </button>
                    <button type="button" onClick={handleImport}
                      disabled={!text.trim() || isImporting}
                      className="px-5 py-2.5 text-sm font-bold bg-indigo-600 hover:bg-indigo-700
                        text-white rounded-xl disabled:opacity-40 transition-colors shadow-sm">
                      {isImporting ? 'Mengimpor…' : 'Import ke Modul Ini'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
