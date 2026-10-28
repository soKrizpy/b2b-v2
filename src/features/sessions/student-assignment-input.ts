/**
 * Parse the PATCH request shape and preserve the distinction between an
 * omitted student_ids field (leave assignments unchanged) and [] (clear them).
 * This helper is deliberately side-effect free so it can be tested without a DB.
 */
export type ParsedStudentIdsInput =
  | { valid: true; body: Record<string, unknown>; hasStudentIds: boolean; studentIds: string[] }
  | { valid: false; error: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseStudentIdsInput(input: unknown): ParsedStudentIdsInput {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, error: 'Request body harus berupa objek JSON.' };
  }

  const body = input as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(body, 'student_ids')) {
    return { valid: true, body, hasStudentIds: false, studentIds: [] };
  }

  if (!Array.isArray(body.student_ids)) {
    return { valid: false, error: 'student_ids harus berupa array.' };
  }

  const studentIds: unknown[] = body.student_ids;
  if (!studentIds.every((id) => typeof id === 'string' && UUID_PATTERN.test(id))) {
    return { valid: false, error: 'Setiap student_ids harus berupa UUID yang valid.' };
  }

  const ids = studentIds as string[];
  if (new Set(ids).size !== ids.length) {
    return { valid: false, error: 'student_ids tidak boleh berisi ID duplikat.' };
  }

  return { valid: true, body, hasStudentIds: true, studentIds: ids };
}
