import { describe, expect, it } from 'vitest';
import { parseStudentIdsInput } from '@/features/sessions/student-assignment-input';

const studentA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const studentB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('parseStudentIdsInput', () => {
  it('treats an omitted student_ids field as leave-unchanged', () => {
    expect(parseStudentIdsInput({ title: 'Updated title' })).toEqual({
      valid: true,
      body: { title: 'Updated title' },
      hasStudentIds: false,
      studentIds: [],
    });
  });

  it('preserves an explicit empty array to mean clear all assignments', () => {
    expect(parseStudentIdsInput({ student_ids: [] })).toEqual({
      valid: true,
      body: { student_ids: [] },
      hasStudentIds: true,
      studentIds: [],
    });
  });

  it('accepts a list of unique UUID student IDs', () => {
    expect(parseStudentIdsInput({ student_ids: [studentA, studentB] })).toMatchObject({
      valid: true,
      hasStudentIds: true,
      studentIds: [studentA, studentB],
    });
  });

  it('rejects student_ids when the field is present but not an array', () => {
    expect(parseStudentIdsInput({ student_ids: studentA })).toEqual({
      valid: false,
      error: 'student_ids harus berupa array.',
    });
    expect(parseStudentIdsInput({ student_ids: null }).valid).toBe(false);
  });

  it('rejects malformed IDs and duplicate IDs', () => {
    expect(parseStudentIdsInput({ student_ids: ['not-a-uuid'] }).valid).toBe(false);
    expect(parseStudentIdsInput({ student_ids: [studentA, studentA] })).toEqual({
      valid: false,
      error: 'student_ids tidak boleh berisi ID duplikat.',
    });
  });

  it('rejects non-object JSON bodies', () => {
    expect(parseStudentIdsInput(null).valid).toBe(false);
    expect(parseStudentIdsInput([]).valid).toBe(false);
    expect(parseStudentIdsInput('invalid').valid).toBe(false);
  });
});
