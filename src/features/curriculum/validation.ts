// src/features/curriculum/validation.ts
// Zod schemas and inferred types for the curriculum JSON import/export format.
// Safe to import from both 'use server' actions and client components.
// Contains NO server-only imports.

import { z } from 'zod';

// ── Quiz question (per-topic, 5 per topic) ────────────────────────────────────

export const quizQuestionSchema = z.object({
  question:    z.string().min(1, 'Teks pertanyaan wajib diisi'),
  options:     z.array(z.string().min(1)).length(4, 'Harus tepat 4 pilihan jawaban'),
  answer_index: z.number().int().min(0).max(3, 'answer_index harus 0–3'),
  explanation: z.string().min(1, 'Penjelasan wajib diisi'),
});

export type QuizQuestion = z.infer<typeof quizQuestionSchema>;

// ── Challenge (per-topic, one per topic) ──────────────────────────────────────

export const topicChallengeSchema = z.object({
  title:           z.string().min(1),
  instructions:    z.string().min(1),
  submission_type: z.literal('link'),
  xp:              z.number().int().min(0).default(30),
});

export type TopicChallenge = z.infer<typeof topicChallengeSchema>;

// ── Final assessment question (20 per module) ─────────────────────────────────

export const assessmentQuestionSchema = z.object({
  id:           z.number().int().min(1),
  question:     z.string().min(1),
  options:      z.array(z.string().min(1)).length(4, 'Harus tepat 4 pilihan jawaban'),
  answer_index: z.number().int().min(0).max(3),
  explanation:  z.string().min(1),
});

export type AssessmentQuestion = z.infer<typeof assessmentQuestionSchema>;

export const finalAssessmentSchema = z.object({
  title:             z.string().min(1).default('Tryout Akhir Modul'),
  duration_minutes:  z.number().int().min(1).max(180).default(30),
  questions:         z
    .array(assessmentQuestionSchema)
    .length(20, 'Final assessment harus memiliki tepat 20 soal'),
});

export type FinalAssessment = z.infer<typeof finalAssessmentSchema>;

// ── Leaf node (theory/code/practice — stored in lesson_content.learningPath) ──

export const nodeSchema = z.object({
  node_id:        z.string().min(1, 'node_id wajib diisi'),
  order:          z.number().int().min(0),
  type:           z.enum(['theory', 'quiz', 'challenge', 'code', 'practice', 'lesson']),
  title:          z.string().min(1),
  content:        z.string().optional(),
  code_content:   z.string().optional(),
  code_language:  z.string().optional(),
  options:        z.array(z.string()).optional(),
  correct_option: z.string().optional(),
  instructions:   z.string().optional(),
  xp:             z.number().int().min(0).default(0),
});

export type NodeImport = z.infer<typeof nodeSchema>;

// ── Topic schema ──────────────────────────────────────────────────────────────

export const topicImportSchema = z.object({
  topic_title:  z.string().min(1, 'topic_title wajib diisi').max(200),
  topic_order:  z.number().int().min(0),
  description:  z.string().optional(),
  project_link: z.string().url().optional().or(z.literal('')),
  nodes:        z.array(nodeSchema).default([]),
  /** Up to 5 graded quiz questions unlocked after teacher marks session complete. */
  quiz:         z.array(quizQuestionSchema).max(5).optional(),
  /** Optional structured challenge definition that overrides free-form challenges table. */
  challenge:    topicChallengeSchema.optional(),
});

export type TopicImport = z.infer<typeof topicImportSchema>;

// ── Module schema ─────────────────────────────────────────────────────────────

export const moduleImportSchema = z.object({
  module_title:      z.string().min(1, 'module_title wajib diisi').max(200),
  module_order:      z.number().int().min(0),
  description:       z.string().optional(),
  level:             z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  gamification_type: z.enum(['mimo', 'duolingo', 'boardgame', 'quest', 'flashcard']).default('mimo'),
  topics:            z.array(topicImportSchema).default([]),
  /** Final 20-question tryout — unlocks when all topics are complete. */
  final_assessment:  finalAssessmentSchema.optional(),
});

export type ModuleImport = z.infer<typeof moduleImportSchema>;

// ── Top-level schema ──────────────────────────────────────────────────────────

export const curriculumJsonSchema = z.union([
  z.array(moduleImportSchema).min(1, 'JSON harus berisi minimal satu modul'),
  moduleImportSchema.transform((m) => [m]),
]);

export type CurriculumJsonInput = z.infer<typeof curriculumJsonSchema>;

// ── Runtime helpers ───────────────────────────────────────────────────────────

/**
 * Extracts the quiz questions stored inside a topic's lesson_content JSONB.
 * The importer stores them at lesson_content.quiz[].
 */
export function extractTopicQuiz(lessonContent: unknown): QuizQuestion[] {
  if (!lessonContent || typeof lessonContent !== 'object') return [];
  const lc = lessonContent as Record<string, unknown>;
  const raw = lc.quiz;
  if (!Array.isArray(raw)) return [];
  const parsed = z.array(quizQuestionSchema).safeParse(raw);
  return parsed.success ? parsed.data : [];
}

export function hasLearningNodes(lessonContent: unknown): boolean {
  if (!lessonContent || typeof lessonContent !== 'object') return false;
  const learningPath = (lessonContent as Record<string, unknown>).learningPath;
  return Array.isArray(learningPath) && learningPath.length > 0;
}

/**
 * Extracts the final assessment stored inside a module's lesson_content-like
 * field. We store it in the module row's description field under a special
 * JSON key, OR in a dedicated column if available.
 *
 * Since modules don't have lesson_content, we store final_assessment in the
 * module's `description` field encoded as JSON prefixed with "FINAL_ASSESSMENT:".
 * This keeps the schema additive without a new column.
 */
export function extractFinalAssessment(
  rawDescription: string | null,
  structuredAssessment?: unknown
): FinalAssessment | null {
  if (structuredAssessment) {
    const parsed = finalAssessmentSchema.safeParse(structuredAssessment);
    if (parsed.success) return parsed.data;
  }
  if (!rawDescription) return null;
  const PREFIX = 'FINAL_ASSESSMENT:';
  if (!rawDescription.startsWith(PREFIX)) return null;
  try {
    const parsed = finalAssessmentSchema.safeParse(
      JSON.parse(rawDescription.slice(PREFIX.length))
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Encodes a FinalAssessment into the description field sentinel format. */
export function encodeFinalAssessment(fa: FinalAssessment): string {
  return `FINAL_ASSESSMENT:${JSON.stringify(fa)}`;
}

/** Certificate tier from a 0-100 score. (>=85 Excellent, >=75 Achievement, <75 Completion) */
export function scoreToCertificateTier(score: number): 'excellent' | 'achievement' | 'completion' {
  if (score >= 85) return 'excellent';
  if (score >= 75) return 'achievement';
  return 'completion';
}
