// src/features/sessions/validation.ts
// Zod v4 schemas for all session (meeting) payloads.
// Used by both Server Actions and API route handlers.

import { z } from 'zod';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Validates that a string is a well-formed absolute URL.
 * Uses z.url() (Zod v4 top-level validator) which calls new URL() internally.
 */
const absoluteUrl = z.url('URL tidak valid. Gunakan format https://...');

/**
 * Validates that a datetime string is a valid ISO 8601 timestamp AND
 * represents a point strictly in the future relative to the time of parsing.
 *
 * z.iso.datetime() in Zod v4 accepts full ISO 8601 strings.
 */
const futureDatetime = z
  .iso
  .datetime({ message: 'Format tanggal tidak valid. Gunakan ISO 8601.' })
  .refine(
    (val) => new Date(val) > new Date(),
    { message: 'Waktu kelas harus di masa mendatang.' }
  );

// ── Login credentials ─────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email:      z.email('Format email tidak valid'),
  password:   z.string().min(1, 'Password wajib diisi'),
  redirectTo: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ── Create session (meeting) ──────────────────────────────────────────────────
// Maps to INSERT INTO meetings + INSERT INTO meeting_students

export const createSessionSchema = z.object({
  title:          z.string().min(1, 'Judul kelas wajib diisi').max(200),
  meeting_date:   futureDatetime,
  link_url:       absoluteUrl,
  notes:          z.string().max(1000).optional(),
  session_count:  z.coerce.number().int().min(1).default(1),
  session_number: z.coerce.number().int().min(1).default(1),
  module_id:      z.coerce.number().int().positive('Pilih modul kurikulum yang valid.'),
  student_ids:    z
    .array(z.string().uuid('ID siswa tidak valid'))
    .min(1, 'Pilih minimal satu siswa'),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;

// ── Update session (meeting) ──────────────────────────────────────────────────
// All fields optional — only supplied fields are updated (PATCH semantics).
// meeting_date validation uses the same future-datetime rule when provided.

export const updateSessionSchema = z.object({
  title:          z.string().min(1).max(200).optional(),
  meeting_date:   futureDatetime.optional(),
  link_url:       absoluteUrl.optional(),
  notes:          z.string().max(1000).optional(),
  session_count:  z.coerce.number().int().min(1).optional(),
  session_number: z.coerce.number().int().min(1).optional(),
  module_id:      z.coerce.number().int().positive().optional(),
  topic_id:       z.coerce.number().int().positive().optional(),
});

export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;

// ── Validation helper ─────────────────────────────────────────────────────────

export type ValidationResult<T> =
  | { success: true;  data: T }
  | { success: false; error: string; fields: Record<string, string> };

/**
 * Runs a Zod schema's safeParse and normalises the result into a flat shape
 * that Server Actions and API handlers can return directly to the client.
 */
export function validate<T>(
  schema: z.ZodType<T>,
  input: unknown
): ValidationResult<T> {
  const result = schema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const flat = result.error.flatten();

  // Merge field errors into a single string per field
  const fields: Record<string, string> = {};
  for (const [key, msgs] of Object.entries(flat.fieldErrors)) {
    if (Array.isArray(msgs) && msgs.length > 0) {
      fields[key] = msgs[0] as string;
    }
  }

  // Attach top-level (non-field) errors to a '_form' key
  if (flat.formErrors.length > 0) {
    fields['_form'] = flat.formErrors[0];
  }

  return {
    success: false,
    error: 'Validasi gagal. Periksa kembali isian formulir.',
    fields,
  };
}
