import { afterEach, describe, expect, it, vi } from 'vitest';
import { getStudentHubBundle } from '@/features/parent-report/queries.student';

const students = vi.hoisted(() =>
  Array.from({ length: 4 }, (_, index) => ({
    id: `student-${index + 1}`,
    full_name: `Student ${index + 1}`,
    total_xp: 0,
    coins: 0,
    meeting_id: index + 101,
  }))
);
const queryState = vi.hoisted(() => ({
  attendanceColumnUnavailable: false,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => {
      let selectedColumns = '';
      const query = {
        filters: [] as Array<[string, string, unknown]>,
        select: (columns = '') => {
          selectedColumns = columns;
          return query;
        },
        eq: (column: string, value: unknown) => {
          query.filters.push(['eq', column, value]);
          return query;
        },
        in: (column: string, value: unknown) => {
          query.filters.push(['in', column, value]);
          return query;
        },
        order: () => query,
        maybeSingle: async () => ({
          data:
            rows().find((row) =>
              query.filters.every(
                ([, column, value]) =>
                  (row as Record<string, unknown>)[column] === value
              )
            ) ?? null,
          error: null,
        }),
        then: (
          resolve: (value: { data: unknown[] | null; error: { message: string } | null }) => unknown,
          reject?: (reason: unknown) => unknown
        ) => {
          if (
            table === 'meeting_students' &&
            selectedColumns.includes('attendance_status') &&
            queryState.attendanceColumnUnavailable
          ) {
            return Promise.resolve({
              data: null,
              error: { message: 'column meeting_students.attendance_status does not exist' },
            }).then(resolve, reject);
          }
          let resultRows = rows();
          if (
            table === 'meeting_students' &&
            !selectedColumns.includes('attendance_status')
          ) {
            resultRows = resultRows.map((row) => {
              const legacyRow = { ...(row as Record<string, unknown>) };
              delete legacyRow.attendance_status;
              return legacyRow;
            });
          }
          return Promise.resolve({ data: resultRows, error: null }).then(resolve, reject);
        },
      };

      function rows(): unknown[] {
        const allRows: Record<string, unknown[]> = {
          students: students.map(({ id, full_name, total_xp, coins }) => ({
            id,
            full_name,
            total_xp,
            coins,
          })),
          meeting_students: students.map(({ id, meeting_id }) => ({
            student_id: id,
            meeting_id,
            has_joined: id !== 'student-3',
            attendance_status:
              id === 'student-2'
                ? 'telat'
                : id === 'student-3'
                  ? 'absen'
                  : 'hadir',
          })),
          meetings: students.map(({ id, meeting_id }, index) => ({
            id: meeting_id,
            title: `Session ${index + 1}`,
            meeting_date: `2026-10-${String(index + 1).padStart(2, '0')}T10:00:00.000Z`,
            progress_report: `Report ${index + 1}`,
            is_completed: true,
            meeting_students: [{ student_id: id }],
          })),
          topic_progress: [],
          student_modules: [],
          challenge_submissions: [],
          invoices: [],
          topics: [],
          challenges: [],
          topic_quiz_attempts: [],
        };

        return (allRows[table] ?? []).filter((row) =>
          query.filters.every(([operator, column, value]) => {
            const item = row as Record<string, unknown>;
            if (operator === 'eq') {
              if (column === 'meeting_students.student_id') {
                return (
                  Array.isArray(item.meeting_students) &&
                  item.meeting_students.some(
                    (student) =>
                      (student as { student_id: string }).student_id === value
                  )
                );
              }
              return item[column] === value;
            }
            return Array.isArray(value) && value.includes(item[column]);
          })
        );
      }

      return query;
    },
  }),
}));

vi.mock('@/features/certificates/queries', () => ({
  getStudentCertificates: async () => [],
}));

describe('Parent Hub reports for linked students', () => {
  afterEach(() => {
    queryState.attendanceColumnUnavailable = false;
  });

  it('falls back to joined attendance when the status column is unavailable', async () => {
    queryState.attendanceColumnUnavailable = true;

    const { hubData } = await getStudentHubBundle('student-2');

    expect(hubData.riwayat[0].sessions[0]).toMatchObject({
      title: 'Session 2',
      progress_report: 'Report 2',
      has_joined: true,
      attendance_status: 'hadir',
    });
  });

  it('keeps each student’s completed sessions and notes separate for a four-student group', async () => {
    const reports = await Promise.all(
      students.map(({ id }) => getStudentHubBundle(id))
    );

    expect(reports).toHaveLength(4);
    reports.forEach(({ hubData }, index) => {
      expect(hubData.studentName).toBe(`Student ${index + 1}`);
      expect(hubData.riwayat).toHaveLength(1);
      expect(hubData.riwayat[0].sessions).toHaveLength(1);
      expect(hubData.riwayat[0].sessions[0]).toMatchObject({
        title: `Session ${index + 1}`,
        progress_report: `Report ${index + 1}`,
        has_joined: index !== 2,
        attendance_status:
          index === 1 ? 'telat' : index === 2 ? 'absen' : 'hadir',
      });
    });
  });
});
