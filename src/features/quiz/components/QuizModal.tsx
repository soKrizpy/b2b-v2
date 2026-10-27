'use client';
// src/features/quiz/components/QuizModal.tsx
// Full-screen modal that hosts the topic quiz.
// After a successful submission it calls awardQuizReward and shows
// an animated result screen with star rating + XP/coin gain.

import { useState, useActionState, useEffect, useTransition, useRef } from 'react';
import { submitTopicQuiz, awardQuizReward, type QuizActionResult, type RewardResult } from '@/features/quiz/actions';
import { explainQuizAnswer } from '@/features/ai/actions';
import type { QuizQuestion } from '@/features/curriculum/validation';
import type { TopicQuizAttemptRow } from '@/types/database';

interface Props {
  topicId:    number;
  topicTitle: string;
  questions:  QuizQuestion[];
  attempts:   TopicQuizAttemptRow[];
  isUnlocked: boolean;
  isLocked:   boolean;
  bestScore:  number;
  onClose:    () => void;
  /** Called after reward is granted so parent can update UI */
  onComplete?: (newScore: number) => void;
}

// ── Star display ──────────────────────────────────────────────────────────────

function Stars({ count }: { count: 0 | 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-1 justify-center" aria-label={`${count} bintang`}>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={`text-2xl transition-all duration-300 ${
            n <= count
              ? 'text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)] scale-110'
              : 'text-slate-300 dark:text-zinc-700'
          }`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function scoreToStars(score: number): 0 | 1 | 2 | 3 {
  if (score >= 100) return 3;
  if (score >= 80)  return 2;
  if (score >= 70)  return 1;
  return 0;
}

// ── Reward screen ─────────────────────────────────────────────────────────────

function RewardScreen({
  score,
  reward,
  onClose,
}: {
  score:   number;
  reward:  RewardResult | null;
  onClose: () => void;
}) {
  const stars   = scoreToStars(score);
  const passed  = score >= 70;

  return (
    <div className="flex flex-col items-center gap-6 px-6 py-8 text-center">
      {/* Animated score ring */}
      <div className={`w-28 h-28 rounded-full flex flex-col items-center justify-center
        shadow-xl ring-4 transition-all duration-500
        ${passed
          ? 'bg-gradient-to-br from-emerald-400 to-cyan-500 ring-emerald-400/40 shadow-emerald-500/30'
          : 'bg-gradient-to-br from-amber-400 to-orange-500 ring-amber-400/40 shadow-amber-500/30'
        }`}>
        <span className="text-3xl font-black text-white tabular-nums">{score}</span>
        <span className="text-xs font-bold text-white/80">/100</span>
      </div>

      {/* Stars */}
      <Stars count={stars} />

      {/* XP + Coins gained */}
      {reward?.success && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl
            bg-violet-500/[0.15] border border-violet-500/25 text-violet-700 dark:text-violet-300">
            <span className="text-base">⭐</span>
            <span className="text-sm font-extrabold">+{reward.xpEarned} XP</span>
          </div>
          <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl
            bg-amber-500/[0.15] border border-amber-500/25 text-amber-700 dark:text-amber-300">
            <span className="text-base">🪙</span>
            <span className="text-sm font-extrabold">+{reward.coinsEarned} Koin</span>
          </div>
        </div>
      )}

      <div>
        <p className="text-base font-extrabold text-slate-900 dark:text-white">
          {passed ? '🎉 Keren! Kamu lulus!' : '💪 Tetap semangat!'}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[220px]">
          {passed
            ? 'Topik ini selesai. Lanjut ke topik berikutnya!'
            : 'Pelajari penjelasannya dan coba lagi jika masih ada kesempatan.'}
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="px-8 py-3 rounded-2xl text-sm font-extrabold text-white
          bg-gradient-to-r from-indigo-600 to-violet-600
          shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95
          transition-all duration-150"
      >
        Kembali ke Quest Map
      </button>
    </div>
  );
}

// ── Breakdown card with AI explain button ─────────────────────────────────────

type BreakdownItem = {
  questionIndex: number;
  question:      string;
  chosenIndex:   number;
  correctIndex:  number;
  isCorrect:     boolean;
  explanation:   string;
};

function BreakdownCard({
  item: b,
  index: i,
  topicTitle,
}: { item: BreakdownItem; index: number; topicTitle: string }) {
  const [aiText,    setAiText]    = useState<string | null>(null);
  const [aiPending, setAiPending] = useState(false);
  const [, startAi] = useTransition();

  const handleExplain = () => {
    setAiPending(true);
    const fd = new FormData();
    fd.append('question',     b.question);
    fd.append('wrong_answer', b.isCorrect ? '' : (['A','B','C','D'][b.chosenIndex] ?? b.question));
    fd.append('right_answer', ['A','B','C','D'][b.correctIndex] ?? '');
    fd.append('explanation',  b.explanation);
    fd.append('topic_title',  topicTitle);
    startAi(async () => {
      const r = await explainQuizAnswer(null, fd);
      setAiPending(false);
      if (r.success) setAiText(r.data);
    });
  };

  return (
    <div className={`rounded-2xl ring-1 p-4 flex flex-col gap-2 ${
      b.isCorrect
        ? 'ring-emerald-200 dark:ring-emerald-700/40 bg-emerald-50/60 dark:bg-emerald-900/10'
        : 'ring-red-200 dark:ring-red-700/40 bg-red-50/60 dark:bg-red-900/10'
    }`}>
      <p className="text-sm font-semibold text-slate-800 dark:text-white flex items-start gap-2">
        <span>{b.isCorrect ? '✅' : '❌'}</span>
        <span>{i + 1}. {b.question}</span>
      </p>
      <p className={`text-xs font-medium ${b.isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
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

      {/* AI deeper explanation — only for wrong answers */}
      {!b.isCorrect && !aiText && (
        <button
          type="button"
          onClick={handleExplain}
          disabled={aiPending}
          className="self-start inline-flex items-center gap-1.5 px-3 py-1.5
            rounded-xl text-[10px] font-extrabold
            bg-gradient-to-r from-violet-600 to-purple-600 text-white
            hover:shadow-md hover:-translate-y-0.5 active:scale-95
            disabled:opacity-50 transition-all duration-150 mt-1"
        >
          {aiPending ? (
            <><span className="inline-block w-3 h-3 border border-white/40 border-t-white
              rounded-full animate-spin" /> Menjelaskan…</>
          ) : (
            <>✨ Jelaskan Lebih Dalam</>
          )}
        </button>
      )}

      {aiText && (
        <div className="mt-2 rounded-xl bg-violet-50 dark:bg-violet-950/30
          border border-violet-200 dark:border-violet-700/40 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-wide
            text-violet-500 dark:text-violet-400 mb-1.5 flex items-center gap-1.5">
            ✨ Penjelasan AI
          </p>
          <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
            {aiText}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Quiz form (reused logic from TopicQuizWidget, inline for modal) ───────────

function QuizForm({
  topicId,
  topicTitle,
  questions,
  attemptsUsed,
  bestScore,
  onResult,
}: {
  topicId:      number;
  topicTitle:   string;
  questions:    QuizQuestion[];
  attemptsUsed: number;
  bestScore:    number;
  onResult:     (score: number, attemptNum: number) => void;
}) {
  const [selected,  setSelected]  = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [state, dispatch, pending] = useActionState<QuizActionResult | null, FormData>(
    submitTopicQuiz, null
  );

  const handledAttemptRef = useRef<number | null>(null);

  useEffect(() => {
    if (
      state?.success &&
      handledAttemptRef.current !== state.result.attemptNum
    ) {
      // onResult is recreated by the parent on render; guard the persisted
      // attempt so effect re-runs cannot trigger a second reward claim.
      handledAttemptRef.current = state.result.attemptNum;
      onResult(state.result.score, state.result.attemptNum);
    }
  }, [state, onResult]);

  const allAnswered = questions.every((_, i) => selected[i] !== undefined);
  const result      = state?.success ? state.result : null;

  // ── Results view with breakdown ──
  if (submitted && result) {
    return (
      <div className="flex flex-col gap-4 px-1 py-2">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Pembahasan Soal
        </p>
        {result.breakdown.map((b, i) => (
          <BreakdownCard key={i} item={b} index={i} topicTitle={topicTitle} />
        ))}
      </div>
    );
  }

  // ── Quiz form ──
  return (
    <form
      action={(fd) => {
        fd.append('topic_id', String(topicId));
        fd.append('answers', JSON.stringify(
          Object.entries(selected).map(([qi, ci]) => ({
            question_index: Number(qi),
            chosen_index:   ci,
          }))
        ));
        dispatch(fd);
        setSubmitted(true);
      }}
      className="flex flex-col gap-5 px-1 py-2"
    >
      {/* Attempt indicator */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-500 dark:text-slate-400">
          Percobaan {attemptsUsed + 1} dari 2
        </span>
        {bestScore > 0 && (
          <span className="text-slate-400 dark:text-slate-500">
            Skor sebelumnya: <strong className="text-indigo-600 dark:text-indigo-400">{bestScore}</strong>
          </span>
        )}
      </div>

      {state && !state.success && (
        <p role="alert" className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20
          rounded-xl px-3 py-2 ring-1 ring-red-200 dark:ring-red-700/40">
          {state.error}
        </p>
      )}

      {questions.map((q, qi) => (
        <div key={qi} className="bg-white dark:bg-zinc-900 rounded-2xl ring-1
          ring-slate-200 dark:ring-zinc-800 p-4">
          <p className="text-sm font-semibold text-slate-800 dark:text-white mb-3">
            <span className="mr-2 text-indigo-500 font-black">{qi + 1}.</span>{q.question}
          </p>
          <div className="flex flex-col gap-2">
            {q.options.map((opt, oi) => (
              <button
                key={oi}
                type="button"
                onClick={() => setSelected((s) => ({ ...s, [qi]: oi }))}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium
                  transition-all ring-1 cursor-pointer
                  ${selected[qi] === oi
                    ? 'ring-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-900 dark:text-indigo-200'
                    : 'ring-slate-200 dark:ring-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:ring-indigo-300'
                  }`}
              >
                <span className="font-bold mr-2 text-slate-400">
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
        className="self-end px-7 py-3 rounded-2xl text-sm font-extrabold text-white
          bg-gradient-to-r from-indigo-600 to-violet-600
          shadow-lg hover:-translate-y-0.5 active:scale-95
          disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
      >
        {pending ? 'Menilai…' : 'Kumpulkan Jawaban →'}
      </button>

      {/* Centered Loading Modal Overlay during quiz evaluation */}
      {pending && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border-2 border-indigo-400/80 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center gap-4 text-center max-w-xs animate-in zoom-in-95 duration-150 my-auto text-white">
            <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <div>
              <h4 className="text-base font-black text-white">Menilai Jawaban Kuis...</h4>
              <p className="text-xs text-slate-300 mt-1">Sistem sedang memeriksa pilihanmu dan menghitung skor.</p>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

// ── Modal root ────────────────────────────────────────────────────────────────

export function QuizModal({
  topicId,
  topicTitle,
  questions,
  attempts,
  isUnlocked,
  isLocked,
  bestScore,
  onClose,
  onComplete,
}: Props) {
  const [phase,  setPhase]  = useState<'quiz' | 'reward'>('quiz');
  const [score,  setScore]  = useState(0);
  const [reward, setReward] = useState<RewardResult | null>(null);
  const [isRewarding, startTransition] = useTransition();
  const [rewardState, rewardDispatch] = useActionState<RewardResult | null, FormData>(
    awardQuizReward, null
  );

  // Sync reward state when server responds
  useEffect(() => {
    if (rewardState) setReward(rewardState);
  }, [rewardState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleQuizResult = (finalScore: number, attemptNum: number) => {
    setScore(finalScore);
    // Fire reward action
    const fd = new FormData();
    fd.append('score',    String(finalScore));
    fd.append('topic_id', String(topicId));
    fd.append('attempt_num', String(attemptNum));
    startTransition(() => rewardDispatch(fd));
    setPhase('reward');
    onComplete?.(finalScore);
  };

  const attemptsUsed = attempts.length;

  return (
    /* Centered Screen Backdrop */
    <div
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center overflow-y-auto overscroll-contain
        bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Centered Loading Modal during reward calculation */}
      {isRewarding && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border-2 border-amber-400/80 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center gap-4 text-center max-w-xs animate-in zoom-in-95 duration-150 my-auto text-white">
            <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <div>
              <h4 className="text-base font-black text-white">Membuka Hadiah Rune...</h4>
              <p className="text-xs text-amber-200 mt-1">Mencatat XP, Koin, dan membuka jalur berikutnya.</p>
            </div>
          </div>
        </div>
      )}

      {/* Panel */}
      <div
        className="relative w-full max-w-xl bg-white dark:bg-zinc-900 border border-blue-400/40 dark:border-purple-500/40
          rounded-3xl shadow-2xl p-5 sm:p-6 flex flex-col min-h-0 max-h-[calc(100dvh-1.5rem)] overflow-hidden my-auto animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-4
          border-b border-slate-200 dark:border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/[0.15] flex items-center
              justify-center text-base flex-shrink-0">
              📝
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest
                text-indigo-500 dark:text-indigo-400">Quiz Topik</p>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white
                leading-snug truncate">
                {topicTitle}
              </h2>
            </div>
          </div>
          <button
            type="button" onClick={onClose}
            aria-label="Tutup"
            className="flex-shrink-0 w-8 h-8 rounded-xl
              bg-slate-100 dark:bg-zinc-800 text-slate-500
              hover:bg-slate-200 dark:hover:bg-zinc-700
              flex items-center justify-center text-sm font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {phase === 'reward' ? (
            <RewardScreen score={score} reward={reward} onClose={onClose} />
          ) : isLocked ? (
            <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
              <span className="text-4xl">🔒</span>
              <p className="font-extrabold text-slate-700 dark:text-white">Quiz Terkunci</p>
              <p className="text-sm text-slate-400 dark:text-slate-500">
                Kamu sudah menggunakan semua percobaan.
                <br />
                Skor terbaik: <strong>{bestScore}</strong>
              </p>
            </div>
          ) : !isUnlocked ? (
            <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
              <span className="text-4xl">⏳</span>
              <p className="font-extrabold text-slate-700 dark:text-white">Quiz Belum Dibuka</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 max-w-xs">
                Quiz akan terbuka setelah guru menyelesaikan sesi dan menandainya selesai.
              </p>
            </div>
          ) : (
            <div className="px-5 py-4">
              <QuizForm
                topicId={topicId}
                topicTitle={topicTitle}
                questions={questions}
                attemptsUsed={attemptsUsed}
                bestScore={bestScore}
                onResult={handleQuizResult}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
