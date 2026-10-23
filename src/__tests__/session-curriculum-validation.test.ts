import { describe, expect, it } from 'vitest';
import { isCompleteModuleSchedule } from '@/features/sessions/curriculumSchedule';
import { createSessionSchema, updateSessionSchema } from '@/features/sessions/validation';

const validCreate = {
  title: 'Kelas Modul A',
  meeting_date: '2099-06-15T10:00:00.000Z',
  link_url: 'https://meet.google.com/example',
  session_count: 2,
  module_id: '12',
  student_ids: ['00000000-0000-4000-8000-000000000001'],
};

describe('guided curriculum schedule validation', () => {
  it('requires a curriculum module for newly created schedules', () => {
    expect(createSessionSchema.safeParse(validCreate).success).toBe(true);
    const { module_id: _moduleId, ...missingModule } = validCreate;
    expect(createSessionSchema.safeParse(missingModule).success).toBe(false);
  });

  it('rejects invalid module IDs', () => {
    expect(createSessionSchema.safeParse({ ...validCreate, module_id: '0' }).success).toBe(false);
    expect(createSessionSchema.safeParse({ ...validCreate, module_id: 'not-a-number' }).success).toBe(false);
  });

  it('keeps module association optional for partial legacy-session updates', () => {
    expect(updateSessionSchema.safeParse({ title: 'Judul diperbarui' }).success).toBe(true);
    expect(updateSessionSchema.safeParse({ module_id: '12' }).success).toBe(true);
    expect(updateSessionSchema.safeParse({ module_id: '' }).success).toBe(false);
  });

  it('requires a series to cover every published topic exactly once', () => {
    expect(isCompleteModuleSchedule(12, 12)).toBe(true);
    expect(isCompleteModuleSchedule(11, 12)).toBe(false);
    expect(isCompleteModuleSchedule(13, 12)).toBe(false);
    expect(isCompleteModuleSchedule(0, 0)).toBe(false);
    expect(isCompleteModuleSchedule(1, null)).toBe(false);
  });
});
