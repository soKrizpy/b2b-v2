'use client';
// Topic Quiz Widget — 2 attempts max, live explanations after each attempt.
import { useActionState, useState } from 'react';
import { submitTopicQuiz, type QuizResult } from '../actions';
import type { QuizQuestion } from '@/features/curriculum/validation';
import type { TopicQuizAttemptRow } from '@/types/database';

interface Props {
  topicId:    number;
  questions:  QuizQuestion[];
  attempts:   TopicQuizAttemptRow[];
  isUnlocked: boolean;
  isLocked:   boolean;
  bestScore:  number;
}

export function TopicQuizWidget({ topicId, questions, attempts, isUnlocked, isLocked, bestScore }: Props) {
  const [selected, setSelected]     = useState<Record<number, number>>({});
  const [submitted, setSubmitted]   = useState(false);
  const [state, dispatch, pending]  = useActionState(submitTopicQuiz, null);

  if (questions.length === 0) return null;

  // Locked (2 attempts used) — show best score
  if (isLocked) {
    const tier = bestScore >= 80 ? '🥇' : bestScore >= 70 ? '🥈' : '🥉';
    return (
      <div className="rounded-2xl ring-1 ring-slate-200 dark:ring-white/10 bg-white dark:bg-[var(--surface)] p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
          📝 Quiz Topik — 2 Percobaan Habis
        </p>
        <div className="flex items-center gap-3 py-3">
          <span className="text-3xl">{tier}</span>
          <div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{bestScore}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Skor terbaik dari 2 percobaan</p>
          </div>
        </div>
      </div>
    );
  }

  // Locked by teacher — quiz not yet unlocked
  if (!isUnlocked) {
    return (
      <div className="rounded-2xl ring-1 ring-amber-200 dark:ring-amber-700/40 bg-amber-50 dark:bg-amber-900/20 p-5">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
          🔒 Quiz Terkunci
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
          Quiz akan terbuka setelah guru menandai kelas ini selesai dan kamu menghadirinya.
        </p>
      </div>
    );
  }

  const attemptsUsed  = attempts.length;
  const latestResult  = state?.success ? state.result : null;

  // Show results after submission
  if (submitted && latestResult) {
    return (
      <ResultView
        result={latestResult}
        onRetry={attemptsUsed < 2 ? () => { setSelected({}); setSubmitted(false); } : undefined}
      />
    );
  }

  // Quiz form
  const allAnswered = questions.every((_, i) => selected[i] !== undefined);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-800 dark:text-white">
          📝 Quiz Topik
          <span className="ml-2 text-xs font-normal text-slate-400">
            Percobaan {attemptsUsed + 1} dari 2
          </span>
        </p>
        {bestScore > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Skor sebelumnya: <strong>{bestScore}</strong>
          </span>
        )}
      </div>

      {state && !state.success && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 ring-1 ring-red-200 dark:ring-red-700/40">
          {state.error}
        </p>
      )}

      <form action={(fd) => {
        fd.append('topic_id', String(topicId));
        fd.append('answers', JSON.stringify(
          Object.entries(selected).map(([qi, ci]) => ({
            question_index: Number(qi),
            chosen_index: ci,
          }))
        ));
        dispatch(fd);
        setSubmitted(true);
      }} className="flex flex-col gap-6">

        {questions.map((q, qi) => (
          <div key={qi} className="bg-white dark:bg-[var(--surface)] rounded-2xl ring-1 ring-slate-200 dark:ring-white/10 p-4">
            <p className="text-sm font-semibold text-slate-800 dark:text-white mb-3">
              <span className="mr-2 text-indigo-500 font-bold">{qi + 1}.</span>{q.question}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {q.options.map((opt, oi) => (
                <button
                  key={oi}
                  type="button"
                  onClick={() => setSelected((s) => ({ ...s, [qi]: oi }))}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium
                    transition-all ring-1 cursor-pointer
                    ${selected[qi] === oi
                      ? 'ring-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-900 dark:text-indigo-200'
                      : 'ring-slate-200 dark:ring-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:ring-indigo-300'
                    }`}
                >
                  <span className={`font-bold mr-2 ${selected[qi] === oi ? 'text-indigo-600 dark:text-indigo-200' : 'text-slate-500 dark:text-slate-400'}`}>
                    {['A','B','C','D'][oi]}.
                  </span>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}

        <button
          type="submit"
          disabled={!allAnswered || pending}
          className="self-start px-6 py-2.5 rounded-xl text-sm font-bold text-white
            bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 transition-colors shadow-sm"
        >
          {pending ? 'Menilai…' : 'Kumpulkan Jawaban'}
        </button>
      </form>
    </div>
  );
}

// ── Results view with explanations ────────────────────────────────────────────

function ResultView({ result, onRetry }: { result: QuizResult; onRetry?: () => void }) {
  const pct     = result.score;
  const passed  = pct >= 70;
  const color   = passed ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';

  return (
    <div className="flex flex-col gap-5">
      {/* Score card */}
      <div className={`rounded-2xl ring-1 p-5 text-center
        ${passed
          ? 'ring-emerald-200 dark:ring-emerald-700/50 bg-emerald-50 dark:bg-emerald-900/20'
          : 'ring-red-200 dark:ring-red-700/50 bg-red-50 dark:bg-red-900/20'
        }`}>
        <p className="text-4xl font-extrabold tabular-nums mb-1 {color}" style={{ color: 'inherit' }}>
          <span className={color}>{pct}</span>
          <span className="text-xl text-slate-500 dark:text-slate-400">/100</span>
        </p>
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          {result.correctCount} dari {result.totalQuestions} benar
          {' · '}Percobaan ke-{result.attemptNum}
          {result.attemptNum === 2 && ` · Skor terbaik: ${result.bestScore}`}
        </p>
        {onRetry && (
          <button onClick={onRetry}
            className="mt-3 px-4 py-2 rounded-xl text-xs font-bold text-white
              bg-indigo-600 hover:bg-indigo-700 transition-colors">
            Coba Lagi (Percobaan 2)
          </button>
        )}
      </div>

      {/* Per-question breakdown */}
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Pembahasan Soal
      </p>
      {result.breakdown.map((b, i) => (
        <div key={i}
          className={`rounded-2xl ring-1 p-4
            ${b.isCorrect
              ? 'ring-emerald-200 dark:ring-emerald-700/40 bg-emerald-50/60 dark:bg-emerald-900/10'
              : 'ring-red-200   dark:ring-red-700/40   bg-red-50/60   dark:bg-red-900/10'
            }`}>
          <p className="text-sm font-semibold text-slate-800 dark:text-white mb-2">
            <span className="mr-1.5">{b.isCorrect ? '✅' : '❌'}</span>
            {i + 1}. {b.question}
          </p>
          <p className={`text-xs font-medium mb-1 ${b.isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            Jawabanmu: <strong>{['A','B','C','D'][b.chosenIndex] ?? '–'}</strong>
            {!b.isCorrect && (
              <span className="ml-2 text-emerald-700 dark:text-emerald-400">
                Jawaban benar: <strong>{['A','B','C','D'][b.correctIndex]}</strong>
              </span>
            )}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
            💡 {b.explanation}
          </p>
        </div>
      ))}
    </div>
  );
}
