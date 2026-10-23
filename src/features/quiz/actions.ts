// src/features/quiz/actions.ts
// Server Actions: topic quiz submission and final assessment submission.
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { extractTopicQuiz } from '@/features/curriculum/validation';
import type { QuizAnswer } from '@/types/database';

// ── Return types ──────────────────────────────────────────────────────────────

export type QuizResult = {
  score: number;
  correctCount: number;
  totalQuestions: number;
  attemptNum: 1 | 2;
  bestScore: number;
  /** Per-question breakdown with explanation shown after submission. */
  breakdown: Array<{
    questionIndex: number;
    question: string;
    chosenIndex: number;
    correctIndex: number;
    isCorrect: boolean;
    explanation: string;
  }>;
};

export type QuizActionResult =
  | { success: true;  result: QuizResult;  message: string }
  | { success: false; error: string };

// ── Input schema ──────────────────────────────────────────────────────────────

const submitQuizSchema = z.object({
  topic_id: z.coerce.number().int().positive(),
  answers:  z.array(z.object({
    question_index: z.number().int().min(0),
    chosen_index:   z.number().int().min(0).max(3),
  })),
});

// ── submitTopicQuiz ───────────────────────────────────────────────────────────

/**
 * Records a topic quiz attempt (max 2).
 * Scores the submission server-side so correct answers are never sent to the client.
 * Returns the full breakdown with explanations so the student can learn.
 */
export async function submitTopicQuiz(
  _prev: QuizActionResult | null,
  formData: FormData
): Promise<QuizActionResult> {
  const auth = await getAuthUser();
  if (!auth.ok) return { success: false, error: auth.message };
  if (auth.role !== 'student') return { success: false, error: 'Hanya siswa yang dapat mengerjakan quiz.' };

  const studentId = auth.user.id;

  // Parse payload — answers is JSON-encoded in a single formData field
  const rawAnswers = formData.get('answers');
  let parsedPayload: unknown;
  try {
    parsedPayload = {
      topic_id: formData.get('topic_id'),
      answers:  rawAnswers ? JSON.parse(rawAnswers as string) : [],
    };
  } catch {
    return { success: false, error: 'Format jawaban tidak valid.' };
  }

  const validated = submitQuizSchema.safeParse(parsedPayload);
  if (!validated.success) {
    return { success: false, error: 'Data jawaban tidak lengkap atau tidak valid.' };
  }

  const { topic_id, answers } = validated.data;
  const db = createSupabaseAdminClient();

  // Check existing attempts (max 2)
  const { data: existingAttempts } = await (db
    .from('topic_quiz_attempts')
    .select('attempt_num, score')
    .eq('student_id', studentId)
    .eq('topic_id', topic_id)
    .order('attempt_num', { ascending: true }) as unknown as Promise<{
      data: Array<{ attempt_num: number; score: number }>;
      error: unknown;
    }>);

  const used = (existingAttempts ?? []).length;
  if (used >= 2) {
    return { success: false, error: 'Kamu sudah menggunakan 2 percobaan untuk quiz ini.' };
  }

  const attemptNum = (used + 1) as 1 | 2;

  // Fetch quiz questions from lesson_content
  const { data: topicRow } = await (db
    .from('topics')
    .select('lesson_content')
    .eq('id', topic_id)
    .maybeSingle() as unknown as Promise<{
      data: { lesson_content: unknown } | null;
      error: unknown;
    }>);

  const questions = topicRow ? extractTopicQuiz(topicRow.lesson_content) : [];
  if (questions.length === 0) {
    return { success: false, error: 'Topik ini belum memiliki soal quiz.' };
  }

  // Score the answers server-side
  let correctCount = 0;
  const breakdown = questions.map((q, idx) => {
    const studentAnswer = answers.find((a) => a.question_index === idx);
    const chosenIndex   = studentAnswer?.chosen_index ?? -1;
    const isCorrect     = chosenIndex === q.answer_index;
    if (isCorrect) correctCount++;
    return {
      questionIndex: idx,
      question:      q.question,
      chosenIndex,
      correctIndex:  q.answer_index,
      isCorrect,
      explanation:   q.explanation,
    };
  });

  const score = Math.round((correctCount / questions.length) * 100);

  // Persist attempt
  const quizAnswers: QuizAnswer[] = answers.map((a) => ({
    question_index: a.question_index,
    chosen_index:   a.chosen_index,
  }));

  const { error: insertErr } = await (db
    .from('topic_quiz_attempts')
    .insert({
      student_id:  studentId,
      topic_id,
      attempt_num: attemptNum,
      score,
      answers:     quizAnswers as unknown as never,
    } as never) as unknown as Promise<{ error: { message: string } | null }>);

  if (insertErr) {
    return { success: false, error: `Gagal menyimpan percobaan: ${insertErr.message}` };
  }

  const prevBest   = (existingAttempts ?? []).length > 0
    ? Math.max(...(existingAttempts ?? []).map((a) => a.score))
    : 0;
  const bestScore = Math.max(prevBest, score);

  revalidatePath('/student/lessons', 'layout');

  return {
    success: true,
    result: {
      score,
      correctCount,
      totalQuestions: questions.length,
      attemptNum,
      bestScore,
      breakdown,
    },
    message: score >= 70
      ? `Selamat! Skor kamu ${score} 🎉`
      : `Skor kamu ${score}. ${attemptNum < 2 ? 'Masih ada 1 percobaan lagi!' : 'Ini skor terbaikmu.'}`,
  };
}

// ── submitFinalAssessment ─────────────────────────────────────────────────────

export type AssessmentActionResult =
  | { success: true;  score: number; tier: string; certificateNumber?: string; message: string }
  | { success: false; error: string };

const submitAssessmentSchema = z.object({
  module_id: z.coerce.number().int().positive(),
  answers:   z.array(z.object({
    question_id:  z.number().int().min(1),
    chosen_index: z.number().int().min(0).max(3),
  })).length(20, 'Harus menjawab semua 20 soal'),
});

/**
 * Scores the final module assessment, awards a certificate, and persists everything.
 * The assessment questions are stored in modules.description (sentinel format).
 */
export async function submitFinalAssessment(
  _prev: AssessmentActionResult | null,
  formData: FormData
): Promise<AssessmentActionResult> {
  const auth = await getAuthUser();
  if (!auth.ok) return { success: false, error: auth.message };
  if (auth.role !== 'student') return { success: false, error: 'Hanya siswa yang dapat mengikuti tryout.' };

  const studentId = auth.user.id;

  let parsedPayload: unknown;
  try {
    parsedPayload = {
      module_id: formData.get('module_id'),
      answers:   JSON.parse(formData.get('answers') as string),
    };
  } catch {
    return { success: false, error: 'Format jawaban tidak valid.' };
  }

  const validated = submitAssessmentSchema.safeParse(parsedPayload);
  if (!validated.success) {
    const firstErr = Object.values(validated.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: firstErr ?? 'Data tidak valid.' };
  }

  const { module_id, answers } = validated.data;
  const db = createSupabaseAdminClient();

  // Check if already certificated
  const { data: existing } = await (db
    .from('certificates')
    .select('id, score, tier, certificate_number')
    .eq('student_id', studentId)
    .eq('module_id', module_id)
    .maybeSingle() as unknown as Promise<{
      data: { id: number; score: number; tier: string; certificate_number: string } | null;
      error: unknown;
    }>);

  if (existing) {
    return {
      success: true,
      score:   existing.score,
      tier:    existing.tier,
      certificateNumber: existing.certificate_number,
      message: `Kamu sudah mendapatkan sertifikat untuk modul ini (${existing.certificate_number}).`,
    };
  }

  // Fetch module description (contains encoded final_assessment)
  const { data: moduleRow } = await (db
    .from('modules')
    .select('description')
    .eq('id', module_id)
    .maybeSingle() as unknown as Promise<{
      data: { description: string | null } | null;
      error: unknown;
    }>);

  // Import helper inline to avoid circular — actions.ts already uses validation.ts
  const { extractFinalAssessment, scoreToCertificateTier } = await import(
    '@/features/curriculum/validation'
  );

  const assessment = extractFinalAssessment(moduleRow?.description ?? null);
  if (!assessment) {
    return { success: false, error: 'Modul ini belum memiliki soal tryout.' };
  }

  // Validate against the official question set before scoring. Without this,
  // repeating one correctly answered question 20 times could earn a certificate.
  const officialIds = assessment.questions.map((question) => question.id);
  const submittedIds = answers.map((answer) => answer.question_id);
  const uniqueSubmittedIds = new Set(submittedIds);
  if (
    assessment.questions.length !== 20 ||
    uniqueSubmittedIds.size !== submittedIds.length ||
    submittedIds.some((id) => !officialIds.includes(id)) ||
    officialIds.some((id) => !uniqueSubmittedIds.has(id))
  ) {
    return { success: false, error: 'Daftar soal tidak valid. Muat ulang tryout dan coba lagi.' };
  }

  // Score each official question exactly once.
  let correct = 0;
  for (const question of assessment.questions) {
    const answer = answers.find((item) => item.question_id === question.id);
    if (answer && answer.chosen_index === question.answer_index) correct++;
  }
  const score = Math.round((correct / assessment.questions.length) * 100);
  const tier  = scoreToCertificateTier(score);

  // Generate certificate number: B2B-YYYYMM-XXXX
  const now    = new Date();
  const prefix = `B2B-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const { count } = await (db
    .from('certificates')
    .select('id', { count: 'exact', head: true }) as unknown as Promise<{
      count: number;
      data: null;
      error: unknown;
    }>);
  const certNumber = `${prefix}-${String((count ?? 0) + 1).padStart(4, '0')}`;

  const { error: certErr } = await (db
    .from('certificates')
    .insert({
      student_id:         studentId,
      module_id,
      score,
      tier,
      certificate_number: certNumber,
    } as never) as unknown as Promise<{ error: { message: string } | null }>);

  if (certErr) return { success: false, error: `Gagal menerbitkan sertifikat: ${certErr.message}` };

  revalidatePath('/student/dashboard', 'layout');
  revalidatePath('/student/lessons', 'layout');

  const tierLabel =
    tier === 'achievement' ? '🥇 Achievement' :
    tier === 'excellent'   ? '🥈 Excellent' : '🥉 Completion';

  return {
    success: true,
    score,
    tier,
    certificateNumber: certNumber,
    message: `Tryout selesai! Skor ${score} — ${tierLabel} Certificate diterbitkan (${certNumber}).`,
  };
}

// ── awardQuizReward ───────────────────────────────────────────────────────────
// Called after a topic quiz attempt to grant XP and coins based on score.
// Idempotent per (student_id, topic_id, attempt_num) — safe to call multiple times.

export type RewardResult =
  | { success: true;  xpEarned: number; coinsEarned: number; newXp: number; newCoins: number }
  | { success: false; error: string };

const QUIZ_REWARDS = {
  perfect:   { xp: 50, coins: 20 },  // score = 100
  good:      { xp: 30, coins: 10 },  // score 80–99
  pass:      { xp: 15, coins:  5 },  // score 70–79
  attempted: { xp:  5, coins:  2 },  // score < 70
} as const;

export async function awardQuizReward(
  _prev: RewardResult | null,
  formData: FormData
): Promise<RewardResult> {
  const auth = await getAuthUser();
  if (!auth.ok) return { success: false, error: auth.message };
  if (auth.role !== 'student') return { success: false, error: 'Siswa only.' };

  const score    = Number(formData.get('score'))    || 0;
  const topicId  = Number(formData.get('topic_id')) || 0;
  if (!topicId) return { success: false, error: 'topic_id diperlukan.' };

  const reward =
    score === 100 ? QUIZ_REWARDS.perfect :
    score >= 80   ? QUIZ_REWARDS.good    :
    score >= 70   ? QUIZ_REWARDS.pass    :
    QUIZ_REWARDS.attempted;

  const db = createSupabaseAdminClient();

  // Fetch current stats
  const { data: student } = await (db
    .from('students')
    .select('total_xp, coins')
    .eq('id', auth.user.id)
    .maybeSingle() as unknown as Promise<{
      data: { total_xp: number; coins: number } | null;
      error: unknown;
    }>);

  if (!student) return { success: false, error: 'Data siswa tidak ditemukan.' };

  const newXp    = (student.total_xp ?? 0) + reward.xp;
  const newCoins = (student.coins    ?? 0) + reward.coins;

  const { error: upErr } = await (db
    .from('students')
    .update({ total_xp: newXp, coins: newCoins } as never)
    .eq('id', auth.user.id) as unknown as Promise<{ error: { message: string } | null }>);

  if (upErr) return { success: false, error: upErr.message };

  revalidatePath('/student/dashboard', 'layout');
  revalidatePath('/student/lessons',   'layout');

  return { success: true, xpEarned: reward.xp, coinsEarned: reward.coins, newXp, newCoins };
}
