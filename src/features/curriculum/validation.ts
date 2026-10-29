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
}).strict();

export type QuizQuestion = z.infer<typeof quizQuestionSchema>;

// ── Challenge (per-topic, one per topic) ──────────────────────────────────────

export const topicChallengeSchema = z.object({
  title:           z.string().min(1),
  instructions:    z.string().min(1),
  submission_type: z.enum(['link', 'file']),
  xp:              z.number().int().min(0).default(30),
}).strict();

export const topicChallengesSchema = z.union([
  topicChallengeSchema,
  z.array(topicChallengeSchema).superRefine((challenges, ctx) => {
    const seen = new Set<string>();
    for (const [index, challenge] of challenges.entries()) {
      const key = [
        challenge.title.trim().toLowerCase(),
        challenge.instructions.trim().toLowerCase(),
        challenge.submission_type,
      ].join('\u0000');
      if (seen.has(key)) {
        ctx.addIssue({
          code: 'custom',
          path: [index],
          message: 'Definisi challenge duplikat dalam topik.',
        });
      }
      seen.add(key);
    }
  }),
]);

export function normalizeTopicChallenges(
  challenge: TopicChallenge | TopicChallenge[] | undefined
): TopicChallenge[] | undefined {
  if (challenge === undefined) return undefined;
  return Array.isArray(challenge) ? challenge : [challenge];
}

export type TopicChallenge = z.infer<typeof topicChallengeSchema>;

// ── Final assessment question (20 per module) ─────────────────────────────────

export const assessmentQuestionSchema = z.object({
  id:           z.number().int().min(1),
  question:     z.string().min(1),
  options:      z.array(z.string().min(1)).length(4, 'Harus tepat 4 pilihan jawaban'),
  answer_index: z.number().int().min(0).max(3),
  explanation:  z.string().min(1),
}).strict();

export type AssessmentQuestion = z.infer<typeof assessmentQuestionSchema>;

export const finalAssessmentSchema = z.object({
  title:             z.string().min(1).default('Tryout Akhir Modul'),
  duration_minutes:  z.number().int().min(1).max(180).default(30),
  questions:         z
    .array(assessmentQuestionSchema)
    .length(20, 'Final assessment harus memiliki tepat 20 soal'),
}).strict();

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
}).strict();

export type NodeImport = z.infer<typeof nodeSchema>;

// ── Topic schema ──────────────────────────────────────────────────────────────

export const topicImportSchema = z.object({
  topic_title:  z.string().min(1, 'topic_title wajib diisi').max(200),
  topic_order:  z.number().int().min(0),
  description:  z.string().optional(),
  project_link: z.string().url().optional().or(z.literal('')),
  /** Every topic must contain 10–20 authored interactive nodes, including challenge nodes. */
  nodes:        z.array(nodeSchema).min(10, 'Setiap topik wajib memiliki minimal 10 node interaktif.').max(20, 'Setiap topik maksimal memiliki 20 node interaktif.'),
  /** Exactly 5 graded quiz questions, unlocked after the teacher submits the session report. */
  quiz:         z.array(quizQuestionSchema).length(5, 'Setiap topik wajib memiliki tepat 5 soal quiz.'),
  /** Optional structured challenge definition that overrides free-form challenges table. */
  challenge:    topicChallengesSchema.optional(),
}).strict().superRefine((topic, ctx) => {
  const seen = new Set<string>();
  for (const [index, node] of topic.nodes.entries()) {
    const key = node.node_id.trim().toLowerCase();
    if (seen.has(key)) {
      ctx.addIssue({ code: 'custom', path: ['nodes', index, 'node_id'], message: 'node_id harus unik dalam topik.' });
    }
    seen.add(key);
  }
});

export type TopicImport = z.infer<typeof topicImportSchema>;

// ── Module schema ─────────────────────────────────────────────────────────────

export const moduleImportSchema = z.object({
  module_title:      z.string().min(1, 'module_title wajib diisi').max(200),
  module_order:      z.number().int().min(0),
  description:       z.string().optional(),
  level:             z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  gamification_type: z.enum(['mimo', 'duolingo', 'boardgame', 'quest', 'flashcard']).default('mimo'),
  topics:            z.array(topicImportSchema).min(1, 'Modul harus memiliki minimal satu topik.'),
  /** Final 20-question tryout — unlocks when all topics are complete. */
  final_assessment:  finalAssessmentSchema.optional(),
}).strict().superRefine((module, ctx) => {
  const seen = new Set<string>();
  for (const [index, topic] of module.topics.entries()) {
    const key = topic.topic_title.trim().toLowerCase();
    if (seen.has(key)) {
      ctx.addIssue({ code: 'custom', path: ['topics', index, 'topic_title'], message: 'Judul topik harus unik dalam modul.' });
    }
    seen.add(key);
  }
});

export type ModuleImport = z.infer<typeof moduleImportSchema>;

// ── Top-level schema ──────────────────────────────────────────────────────────

const moduleListSchema = z.array(moduleImportSchema)
  .min(1, 'JSON harus berisi minimal satu modul')
  .superRefine((modules, ctx) => {
    const seen = new Set<string>();
    for (const [index, module] of modules.entries()) {
      const key = module.module_title.trim().toLowerCase();
      if (seen.has(key)) {
        ctx.addIssue({ code: 'custom', path: [index, 'module_title'], message: 'Judul modul harus unik dalam file import.' });
      }
      seen.add(key);
    }
  });

export const curriculumJsonSchema = z.union([
  moduleListSchema,
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

/** Certificate tier from a 0-100 score. (86-100 Excellent, 75-85 Achievement, <75 Participant) */
export function scoreToCertificateTier(score: number): 'excellent' | 'achievement' | 'completion' {
  if (score >= 86) return 'excellent';
  if (score >= 75) return 'achievement';
  return 'completion';
}
