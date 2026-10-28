'use client';
// src/features/curriculum/components/LessonNodeWalker.tsx
// Mimo-style interactive step-through lesson walker.
// Renders each learningPath node one at a time with XP accumulation.
// Node types: lesson | code | practice (MCQ) | challenge | quiz (marker)

import { useState, useCallback, useEffect, useMemo } from 'react';

// ── Node types (mirrors the lesson engine JSON + curriculum validation.ts) ────

export type NodeType =
  | 'lesson' | 'theory'
  | 'code'
  | 'practice'
  | 'challenge'
  | 'quiz';

export interface LearningNode {
  id?:            string;
  node_id?:       string;
  type:           string;
  title:          string;
  xp?:            number;
  // lesson / theory
  explanation?:   string;
  content?:       string;
  tips?:          string[];
  imageUrl?:      string;
  // code
  code?: {
    language: string;
    content:  string;
  };
  code_language?: string;
  code_content?:  string;
  // practice (MCQ)
  instructions?:  string;
  options?:       string[];
  correctOption?: string;
  correct_option?: string;
  // challenge
  expectedResult?: string;
  starterCode?: { language: string; content: string };
}

interface Props {
  nodes:    LearningNode[];
  topicId:  number;
  /** Authenticated student scope for browser-only lesson resume state. */
  studentId?: string;
  /** Called when all nodes are stepped through */
  onComplete?: () => void;
}

// ── XP tracker ────────────────────────────────────────────────────────────────

const NODE_TYPE_LABEL: Record<string, { label: string; color: string; icon: string }> = {
  lesson:    { label: 'Materi',    color: 'bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-700/40',       icon: '📖' },
  theory:    { label: 'Materi',    color: 'bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-700/40',       icon: '📖' },
  code:      { label: 'Kode',      color: 'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-700/40', icon: '💻' },
  practice:  { label: 'Latihan',   color: 'bg-violet-100 text-violet-700 ring-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-700/40',     icon: '🧩' },
  challenge: { label: 'Challenge', color: 'bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-700/40',           icon: '🎯' },
  quiz:      { label: 'Quiz',      color: 'bg-indigo-100 text-indigo-700 ring-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:ring-indigo-700/40',     icon: '📝' },
};

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({
  current, total, xpEarned, totalXp,
}: { current: number; total: number; xpEarned: number; totalXp: number }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-500 dark:text-slate-400">
          Node {current}/{total}
        </span>
        <span className="font-bold text-amber-600 dark:text-amber-400">
          ⭐ {xpEarned}/{totalXp} XP
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Progress materi"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Node badge ────────────────────────────────────────────────────────────────

function NodeBadge({ type }: { type: string }) {
  const cfg = NODE_TYPE_LABEL[type] ?? {
    label: type, color: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/10 dark:text-slate-300 dark:ring-white/15', icon: '📄',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ── Continue button ───────────────────────────────────────────────────────────

function ContinueBtn({
  onClick, label = 'Lanjut →', disabled = false,
}: { onClick: () => void; label?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="self-end mt-2 inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl
        text-sm font-extrabold text-white
        bg-gradient-to-r from-indigo-600 to-violet-600
        hover:from-indigo-700 hover:to-violet-700
        disabled:opacity-40 disabled:cursor-not-allowed
        shadow-md hover:shadow-lg hover:-translate-y-0.5
        active:scale-95 transition-all duration-150"
    >
      {label}
    </button>
  );
}

// ── Node renderers ────────────────────────────────────────────────────────────

/** Lesson / Theory — explanatory text, optional image, optional tips */
function LessonNode({ node, onNext }: { node: LearningNode; onNext: () => void }) {
  const body = node.explanation ?? node.content ?? '';
  return (
    <div className="flex flex-col gap-4">
      {node.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={node.imageUrl}
          alt={node.title}
          className="w-full max-h-48 object-contain rounded-2xl
            bg-slate-50 dark:bg-white/5 ring-1 ring-slate-200 dark:ring-white/10 p-2"
        />
      )}
      {body && (
        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
          {body}
        </p>
      )}
      {Array.isArray(node.tips) && node.tips.length > 0 && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20
          ring-1 ring-amber-200 dark:ring-amber-700/40 px-4 py-3 flex flex-col gap-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-0.5">
            💡 Tips
          </p>
          {node.tips.map((tip, i) => (
            <p key={i} className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              • {tip}
            </p>
          ))}
        </div>
      )}
      <ContinueBtn onClick={onNext} />
    </div>
  );
}

/** Code — mono block with language label */
function CodeNode({ node, onNext }: { node: LearningNode; onNext: () => void }) {
  const lang    = node.code?.language ?? node.code_language ?? 'text';
  const content = node.code?.content  ?? node.code_content  ?? '';
  const body    = node.explanation ?? node.content ?? '';
  return (
    <div className="flex flex-col gap-4">
      {body && (
        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{body}</p>
      )}
      <div className="rounded-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-white/10">
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 dark:bg-black/60">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="ml-2 text-[10px] font-mono text-slate-400 uppercase">{lang}</span>
        </div>
        <pre className="px-5 py-4 text-xs font-mono leading-relaxed text-emerald-300
          bg-slate-900 overflow-x-auto whitespace-pre-wrap">
          {content}
        </pre>
      </div>
      <ContinueBtn onClick={onNext} />
    </div>
  );
}

/** Practice — multiple choice question */
function PracticeNode({ node, onNext }: { node: LearningNode; onNext: () => void }) {
  const [chosen,    setChosen]    = useState<number | null>(null);
  const [revealed,  setRevealed]  = useState(false);

  const question    = node.instructions ?? node.explanation ?? '';
  const options     = node.options ?? [];
  const correct     = node.correctOption ?? node.correct_option ?? '';
  const correctIdx  = options.indexOf(correct);

  const handleCheck = () => {
    if (chosen === null) return;
    setRevealed(true);
  };

  const isCorrect = chosen !== null && options[chosen] === correct;

  return (
    <div className="flex flex-col gap-4">
      {question && (
        <p className="text-sm font-semibold text-slate-800 dark:text-white leading-relaxed">
          {question}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {options.map((opt, i) => {
          let ring = 'ring-slate-200 dark:ring-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300';
          if (revealed) {
            if (i === correctIdx) ring = 'ring-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 font-bold';
            else if (i === chosen) ring = 'ring-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300';
          } else if (chosen === i) {
            ring = 'ring-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200';
          }
          return (
            <button
              key={i}
              type="button"
              disabled={revealed}
              onClick={() => !revealed && setChosen(i)}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm
                transition-all ring-1 ${ring}
                ${revealed ? 'cursor-default' : 'hover:ring-indigo-300 cursor-pointer'}`}
            >
              <span className="font-bold mr-2 text-slate-400">
                {['A', 'B', 'C', 'D'][i]}.
              </span>
              {opt}
              {revealed && i === correctIdx && <span className="ml-2">✓</span>}
              {revealed && i === chosen && i !== correctIdx && <span className="ml-2">✗</span>}
            </button>
          );
        })}
      </div>

      {/* Feedback */}
      {revealed && (
        <div className={`rounded-xl px-4 py-3 text-sm font-semibold
          ${isCorrect
            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-700/40'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 ring-1 ring-red-200 dark:ring-red-700/40'
          }`}>
          {isCorrect ? '🎉 Benar! Lanjutkan!' : `❌ Jawaban benar: ${correct}`}
        </div>
      )}

      <div className="flex justify-end gap-2">
        {!revealed && (
          <button
            type="button"
            onClick={handleCheck}
            disabled={chosen === null}
            className="px-5 py-2 rounded-xl text-sm font-bold text-white
              bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            Cek Jawaban
          </button>
        )}
        {revealed && <ContinueBtn onClick={onNext} />}
      </div>
    </div>
  );
}

/** Challenge — project prompt with optional starter code */
function ChallengeNode({ node, onNext }: { node: LearningNode; onNext: () => void }) {
  const instructions  = node.instructions ?? node.explanation ?? '';
  const expected      = node.expectedResult ?? '';
  const starter       = node.starterCode ?? null;
  return (
    <div className="flex flex-col gap-4">
      {instructions && (
        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
          {instructions}
        </p>
      )}
      {expected && (
        <div className="rounded-xl bg-sky-50 dark:bg-sky-900/20
          ring-1 ring-sky-200 dark:ring-sky-700/40 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-sky-600 dark:text-sky-400 mb-1">
            🎯 Hasil yang diharapkan
          </p>
          <p className="text-xs text-sky-800 dark:text-sky-300 leading-relaxed">{expected}</p>
        </div>
      )}
      {starter && (
        <div className="rounded-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-white/10">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 dark:bg-black/60">
            <span className="text-[10px] font-mono text-slate-400 uppercase">
              {starter.language} — Starter
            </span>
          </div>
          <pre className="px-5 py-4 text-xs font-mono leading-relaxed text-slate-300
            bg-slate-900 overflow-x-auto whitespace-pre-wrap">
            {starter.content}
          </pre>
        </div>
      )}
      <ContinueBtn onClick={onNext} label="Tandai Selesai →" />
    </div>
  );
}

/** Quiz marker — tells student to scroll down to the quiz section */
function QuizMarkerNode({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <span className="text-5xl" aria-hidden="true">📝</span>
      <div>
        <p className="font-extrabold text-slate-900 dark:text-white">Saatnya Quiz!</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Gulir ke bawah untuk mengerjakan 5 soal quiz topik ini.
        </p>
      </div>
      <ContinueBtn onClick={onNext} label="Siap! ↓" />
    </div>
  );
}

/** Completed state */
function CompletedState({
  xpEarned, onRestart,
}: { xpEarned: number; onRestart: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <span className="text-6xl select-none" aria-hidden="true">🎉</span>
      <div>
        <p className="text-xl font-extrabold text-slate-900 dark:text-white">Materi Selesai!</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Kamu mengumpulkan <span className="font-bold text-amber-600 dark:text-amber-400">+{xpEarned} XP</span> dari node materi ini.
        </p>
      </div>
      <p className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold">
        Gulir ke bawah untuk challenge &amp; quiz ↓
      </p>
      <button
        type="button"
        onClick={onRestart}
        className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600
          dark:hover:text-slate-300 underline underline-offset-2 transition-colors"
      >
        Ulangi materi dari awal
      </button>
    </div>
  );
}

// ── Main walker ───────────────────────────────────────────────────────────────

export function LessonNodeWalker({ nodes, topicId, studentId, onComplete }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [completedIndexes, setCompletedIndexes] = useState<Set<number>>(() => new Set());
  const [done,       setDone]        = useState(false);
  const [progressReady, setProgressReady] = useState(false);

  const storageKey = studentId
    ? `b2b:lesson-progress:v1:${studentId}:${topicId}`
    : null;
  const nodeSignature = JSON.stringify(nodes);
  const nodeKeys = useMemo(
    () => nodes.map((node, index) => node.id ?? node.node_id ?? `${index}:${node.type}:${node.title}`),
    [nodes]
  );

  useEffect(() => {
    if (!storageKey) {
      setProgressReady(true);
      return;
    }

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const saved: unknown = JSON.parse(raw);
        if (saved && typeof saved === 'object') {
          const value = saved as {
            signature?: unknown;
            completedNodeKeys?: unknown;
            currentNodeKey?: unknown;
            done?: unknown;
          };
          if (value.signature === nodeSignature && Array.isArray(value.completedNodeKeys)) {
            const completed = new Set<number>();
            value.completedNodeKeys.forEach((key) => {
              const index = nodeKeys.indexOf(key as string);
              if (index >= 0) completed.add(index);
            });
            const currentIndex = typeof value.currentNodeKey === 'string'
              ? nodeKeys.indexOf(value.currentNodeKey)
              : 0;
            setCompletedIndexes(completed);
            setCurrentIdx(Math.max(0, currentIndex));
            setDone(value.done === true && completed.size === nodes.length && nodes.length > 0);
          }
        }
      }
    } catch {
      // Browser storage is an optional resume convenience, never an authority.
    } finally {
      setProgressReady(true);
    }
  }, [nodeKeys, nodeSignature, nodes.length, storageKey]);

  useEffect(() => {
    if (!progressReady || !storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({
        signature: nodeSignature,
        completedNodeKeys: nodeKeys.filter((_, index) => completedIndexes.has(index)),
        currentNodeKey: nodeKeys[currentIdx] ?? null,
        done,
      }));
    } catch {
      // Storage can be disabled or full; lesson navigation still works in memory.
    }
  }, [completedIndexes, currentIdx, done, nodeKeys, nodeSignature, progressReady, storageKey]);

  const totalXp = nodes.reduce((s, n) => s + (n.xp ?? 0), 0);
  const xpEarned = nodes.reduce(
    (sum, node, index) => sum + (completedIndexes.has(index) ? node.xp ?? 0 : 0),
    0
  );

  const advance = useCallback(() => {
    setCompletedIndexes((current) => {
      if (current.has(currentIdx)) return current;
      const next = new Set(current);
      next.add(currentIdx);
      return next;
    });

    if (currentIdx >= nodes.length - 1) {
      setDone(true);
      onComplete?.();
    } else {
      setCurrentIdx((i) => i + 1);
    }
  }, [currentIdx, nodes, onComplete]);

  const restart = useCallback(() => {
    setCurrentIdx(0);
    setDone(false);
  }, []);

  if (nodes.length === 0) return null;

  const node = nodes[currentIdx];

  return (
    <div className="bg-white dark:bg-[var(--surface)] rounded-3xl ring-1
      ring-slate-200 dark:ring-white/10 shadow-sm overflow-hidden">

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700
        px-5 py-4">
        <ProgressBar
          current={done ? nodes.length : currentIdx + 1}
          total={nodes.length}
          xpEarned={xpEarned}
          totalXp={totalXp}
        />
      </div>

      {/* ── Node content ── */}
      {done ? (
        <div className="px-5 py-6">
          <CompletedState xpEarned={xpEarned} onRestart={restart} />
        </div>
      ) : (
        <div className="px-5 py-5" aria-live="polite">
          {currentIdx > 0 && (
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setCurrentIdx((index) => Math.max(0, index - 1))}
                className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5 sm:w-auto"
              >
                ← Kembali ke langkah sebelumnya
              </button>
              <span className="self-center text-xs font-bold text-slate-500 dark:text-slate-400">
                Langkah {currentIdx + 1} dari {nodes.length}
              </span>
            </div>
          )}
          {/* Node header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <NodeBadge type={node.type} />
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base mt-1 leading-snug">
                {node.title}
              </h3>
            </div>
            {(node.xp ?? 0) > 0 && (
              <span className="flex-shrink-0 text-xs font-bold text-amber-600 dark:text-amber-400
                bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-full ring-1
                ring-amber-200 dark:ring-amber-700/40">
                +{node.xp} XP
              </span>
            )}
          </div>

          {/* Node body — switch on type */}
          {(node.type === 'lesson' || node.type === 'theory') && (
            <LessonNode node={node} onNext={advance} />
          )}
          {node.type === 'code' && (
            <CodeNode node={node} onNext={advance} />
          )}
          {node.type === 'practice' && (
            <PracticeNode node={node} onNext={advance} />
          )}
          {node.type === 'challenge' && (
            <ChallengeNode node={node} onNext={advance} />
          )}
          {node.type === 'quiz' && (
            <QuizMarkerNode onNext={advance} />
          )}
          {/* Unknown type — just continue */}
          {!['lesson','theory','code','practice','challenge','quiz'].includes(node.type) && (
            <div className="flex flex-col gap-3">
              {(node.explanation ?? node.content ?? node.instructions) && (
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                  {node.explanation ?? node.content ?? node.instructions}
                </p>
              )}
              <ContinueBtn onClick={advance} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
