'use client';
// Tryout layout: 70% question area / 30% sidebar with grid + timer + submit.
import { useActionState, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitFinalAssessment, type AssessmentActionResult } from '@/features/quiz/actions';
import type { FinalAssessment } from '@/features/curriculum/validation';

interface Props {
  moduleId:   number;
  assessment: FinalAssessment;
}

type AnswerMap = Record<number, number>;   // question id → chosen_index
type Marked    = Set<number>;              // question ids marked for review (ragu-ragu)

export function TryoutClient({ moduleId, assessment }: Props) {
  const router                     = useRouter();
  const total                      = assessment.questions.length; // 20
  const [current, setCurrent]      = useState(0);
  const [answers, setAnswers]      = useState<AnswerMap>({});
  const [marked, setMarked]        = useState<Marked>(new Set());
  const [secondsLeft, setSecs]     = useState(assessment.duration_minutes * 60);
  const [submitted, setSubmitted]  = useState(false);
  const [state, dispatch, pending] = useActionState(submitFinalAssessment, null);
  const timerRef                   = useRef<ReturnType<typeof setInterval> | null>(null);

  const q = assessment.questions[current];

  // Countdown timer
  useEffect(() => {
    if (submitted) return;
    timerRef.current = setInterval(() => {
      setSecs((s) => {
        if (s <= 1) {
          // Auto-submit when time's up
          handleSubmit();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isLow = secondsLeft < 300; // < 5 min

  const selectAnswer = (questionId: number, chosenIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: chosenIndex }));
  };

  const toggleMark = useCallback((questionId: number) => {
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }, []);

  const handleSubmit = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitted(true);
    const fd = new FormData();
    fd.append('module_id', String(moduleId));
    fd.append('answers', JSON.stringify(
      assessment.questions.map((q) => ({
        question_id:  q.id,
        chosen_index: answers[q.id] ?? 0,
      }))
    ));
    dispatch(fd);
  }, [moduleId, answers, assessment.questions, dispatch]);

  const answeredCount = Object.keys(answers).length;

  // ── Results screen ──────────────────────────────────────────────────────────
  if (state?.success) {
    const tierEmoji = state.tier === 'excellent' ? '🏆' : state.tier === 'achievement' ? '🥇' : '🥉';
    const tierLabel = state.tier === 'excellent' ? 'Excellent' : state.tier === 'achievement' ? 'Achievement' : 'Completion';
    return (
      <div className="max-w-xl mx-auto py-16 text-center flex flex-col items-center gap-6">
        <span className="text-7xl">{tierEmoji}</span>
        <div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {state.score} / 100
          </p>
          <p className="mt-2 text-lg font-bold text-slate-700 dark:text-slate-200">
            {tierLabel} Certificate
          </p>
          {state.certificateNumber && (
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 font-mono">
              #{state.certificateNumber}
            </p>
          )}
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{state.message}</p>
        </div>
        <button onClick={() => router.push('/student/lessons')}
          className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">
          Kembali ke Pelajaran
        </button>
      </div>
    );
  }

  if (state && !state.success) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <p className="text-red-600 dark:text-red-400 font-semibold">{state.error}</p>
        <button onClick={() => router.push('/student/lessons')}
          className="mt-4 px-4 py-2 rounded-xl text-sm font-bold text-white bg-indigo-600">
          Kembali
        </button>
      </div>
    );
  }

  // ── Tryout UI ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6 h-full">

      {/* ── Left: Question area (70%) ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">

        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {assessment.title}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Soal {current + 1} dari {total}
          </span>
        </div>

        {/* Question card */}
        <div className="bg-white dark:bg-[var(--surface)] rounded-2xl ring-1 ring-slate-200 dark:ring-white/10 p-5 flex-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-white mb-4 leading-relaxed">
            <span className="mr-2 text-indigo-500 font-bold">{current + 1}.</span>
            {q.question}
          </p>

          <div className="flex flex-col gap-2.5">
            {q.options.map((opt, oi) => {
              const chosen = answers[q.id] === oi;
              return (
                <button key={oi} type="button"
                  onClick={() => selectAnswer(q.id, oi)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium
                    transition-all ring-1 cursor-pointer
                    ${chosen
                      ? 'ring-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-900 dark:text-indigo-100'
                      : 'ring-slate-200 dark:ring-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:ring-indigo-300'
                    }`}>
                  <span className="font-bold mr-2 text-slate-400">{['A','B','C','D'][oi]}.</span>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-white/15
              text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5
              disabled:opacity-40 transition-colors">
            ← Sebelumnya
          </button>

          <button onClick={() => toggleMark(q.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium ring-1 transition-all
              ${marked.has(q.id)
                ? 'bg-amber-100 ring-amber-300 text-amber-800 dark:bg-amber-900/30 dark:ring-amber-600/60 dark:text-amber-300'
                : 'ring-slate-200 dark:ring-white/15 text-slate-600 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-900/10'
              }`}>
            {marked.has(q.id) ? '🚩 Ditandai' : '🚩 Ragu-ragu'}
          </button>

          <button onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))}
            disabled={current === total - 1}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-white/15
              text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5
              disabled:opacity-40 transition-colors">
            Berikutnya →
          </button>
        </div>
      </div>

      {/* ── Right: Sidebar (30%) ─────────────────────────────────────────── */}
      <div className="lg:w-72 flex flex-col gap-4 flex-shrink-0">

        {/* Timer */}
        <div className={`rounded-2xl ring-1 p-4 text-center
          ${isLow
            ? 'ring-red-300 bg-red-50 dark:ring-red-600/50 dark:bg-red-900/20'
            : 'ring-slate-200 bg-white dark:ring-white/10 dark:bg-[var(--surface)]'
          }`}>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
            ⏱ Waktu Tersisa
          </p>
          <p className={`text-3xl font-extrabold tabular-nums font-mono
            ${isLow ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
            {formatTime(secondsLeft)}
          </p>
        </div>

        {/* Question grid */}
        <div className="bg-white dark:bg-[var(--surface)] rounded-2xl ring-1 ring-slate-200 dark:ring-white/10 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
            Navigasi Soal
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {assessment.questions.map((q, idx) => {
              const isAnswered = answers[q.id] !== undefined;
              const isMarked   = marked.has(q.id);
              const isCurrent  = idx === current;

              return (
                <button key={q.id} type="button"
                  onClick={() => setCurrent(idx)}
                  className={`h-9 w-full rounded-lg text-xs font-bold transition-all ring-1
                    ${isCurrent
                      ? 'ring-indigo-500 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200'
                      : isMarked
                      ? 'ring-amber-400 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                      : isAnswered
                      ? 'ring-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300'
                      : 'ring-slate-200 dark:ring-white/15 bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400'
                    }`}>
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[10px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-emerald-200 dark:bg-emerald-900/60 ring-1 ring-emerald-400" />
              Dijawab ({answeredCount})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-amber-200 dark:bg-amber-900/60 ring-1 ring-amber-400" />
              Ragu ({marked.size})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-slate-100 dark:bg-white/10 ring-1 ring-slate-200 dark:ring-white/15" />
              Belum ({total - answeredCount})
            </span>
          </div>
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={pending || submitted}
          className="w-full py-3 rounded-2xl text-sm font-bold text-white
            bg-gradient-to-r from-indigo-600 to-violet-600
            hover:from-indigo-700 hover:to-violet-700
            disabled:opacity-50 transition-all shadow-md shadow-indigo-200 dark:shadow-indigo-900/40">
          {pending ? 'Menilai…' : `Kumpulkan (${answeredCount}/${total})`}
        </button>

        {answeredCount < total && (
          <p className="text-xs text-amber-600 dark:text-amber-400 text-center -mt-2">
            ⚠ {total - answeredCount} soal belum dijawab
          </p>
        )}
      </div>
    </div>
  );
}
