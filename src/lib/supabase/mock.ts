// src/lib/supabase/mock.ts
// In-memory mock Supabase store & query builder used when Supabase environment
// configuration is missing. Missing values must never silently target a hosted database.

import {
  scratchTopicsData,
  scratchFinalAssessment,
} from '@/features/curriculum/data/scratchModuleData';
import { encodeFinalAssessment } from '@/features/curriculum/validation';

export interface MockUser {
  id: string;
  email: string;
  password?: string;
  user_metadata: {
    full_name?: string;
    role?: 'admin' | 'teacher' | 'student';
    [key: string]: unknown;
  };
}

export interface PreviewFallbackSession {
  user: {
    id: string;
    email?: string;
    user_metadata: {
      full_name?: string;
      role?: 'admin' | 'teacher' | 'student';
      [key: string]: unknown;
    };
  };
  role: 'admin' | 'teacher' | 'student';
  accessToken?: string | null;
  isMock?: boolean;
  updatedAt: number;
}

type MockRow = Record<string, unknown>;

interface MockStore {
  users: MockUser[];
  profiles: MockRow[];
  students: MockRow[];
  modules: MockRow[];
  topics: MockRow[];
  student_modules: MockRow[];
  meetings: MockRow[];
  meeting_students: MockRow[];
  quizzes: MockRow[];
  quiz_questions: MockRow[];
  quiz_attempts: MockRow[];
  topic_progress: MockRow[];
  student_pets: MockRow[];
  student_badges: MockRow[];
  parent_links: MockRow[];
  announcements: MockRow[];
  module_assessments: MockRow[];
  module_assessment_questions: MockRow[];
  module_assessment_attempts: MockRow[];
  topic_quiz_attempts: MockRow[];
  certificates: MockRow[];
  challenges: MockRow[];
  challenge_submissions: MockRow[];
  invoices: MockRow[];
  [table: string]: unknown[];
}

const globalForMock = globalThis as unknown as {
  __b2bMockStore?: MockStore;
  __b2bInvalidKeys?: Set<string>;
  __b2bPreviewSession?: PreviewFallbackSession | null;
};

export function setPreviewFallbackSession(
  session: Omit<PreviewFallbackSession, 'updatedAt'>
): void {
  globalForMock.__b2bPreviewSession = {
    ...session,
    updatedAt: Date.now(),
  };
}

export function getPreviewFallbackSession(): PreviewFallbackSession | null {
  const s = globalForMock.__b2bPreviewSession;
  if (!s) return null;
  // Valid for 7 days
  if (Date.now() - s.updatedAt > 7 * 24 * 60 * 60 * 1000) {
    globalForMock.__b2bPreviewSession = null;
    return null;
  }
  return s;
}

export function clearPreviewFallbackSession(): void {
  globalForMock.__b2bPreviewSession = null;
}

export function markSupabaseKeyInvalid(key: string | undefined): void {
  if (!key) return;
  if (!globalForMock.__b2bInvalidKeys) {
    globalForMock.__b2bInvalidKeys = new Set<string>();
  }
  globalForMock.__b2bInvalidKeys.add(sanitizeEnvVal(key));
}

const DEFAULT_SUPABASE_SERVICE_ROLE_KEY = '';

export function sanitizeEnvVal(raw: string | undefined): string {
  if (!raw) return '';
  let clean = raw
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .trim();
  // Auto-heal common copy-paste truncation where leading 'e' of 'eyJhbGci...' was cut off
  if (clean.startsWith('yJhbGci')) {
    clean = 'e' + clean;
  } else if (clean.startsWith('JhbGci')) {
    clean = 'ey' + clean;
  }
  return clean;
}

export function isValidSupabaseKey(raw: string | undefined): boolean {
  const k = sanitizeEnvVal(raw);
  if (!k) return false;
  if (globalForMock.__b2bInvalidKeys?.has(k)) return false;
  // Standard Supabase JWT key (3 base64url segments starting with eyJ)
  if (k.startsWith('eyJ') && k.split('.').length === 3 && k.length > 80)
    return true;
  // New Supabase API keys (sb_publishable_... / sb_secret_...)
  if (
    (k.startsWith('sb_publishable_') || k.startsWith('sb_secret_')) &&
    k.length > 20
  )
    return true;
  return false;
}

export function getSupabaseUrl(): string {
  const envUrl = sanitizeEnvVal(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (envUrl.startsWith('http://') || envUrl.startsWith('https://')) {
    return envUrl;
  }
  return '';
}

export function getSupabaseAnonKey(): string {
  const envAnon = sanitizeEnvVal(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (isValidSupabaseKey(envAnon)) {
    return envAnon;
  }
  return '';
}

export function getSupabaseServiceRoleKey(): string {
  const envService = sanitizeEnvVal(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (isValidSupabaseKey(envService)) {
    return envService;
  }
  return DEFAULT_SUPABASE_SERVICE_ROLE_KEY;
}

function createInitialMockStore(): MockStore {
  const now = new Date();
  const inTwoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const nextWeek = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000
  ).toISOString();
  const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthYear = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

  return {
    users: [
      {
        id: 'admin-demo-1',
        email: 'admin@b2b.id',
        password: 'password123',
        user_metadata: { full_name: 'Admin Bits2Bytes', role: 'admin' },
      },
      {
        id: 'teacher-demo-1',
        email: 'guru@b2b.id',
        password: 'password123',
        user_metadata: { full_name: 'Kak Budi Santoso', role: 'teacher' },
      },
      {
        id: 'student-demo-1',
        email: '08123456789@student.mylms.app',
        password: '123456',
        user_metadata: { full_name: 'Raka Pratama', role: 'student' },
      },
      {
        id: 'student-demo-2',
        email: '08987654321@student.mylms.app',
        password: '123456',
        user_metadata: { full_name: 'Nadia Putri', role: 'student' },
      },
    ],
    profiles: [
      {
        id: 'admin-demo-1',
        role: 'admin',
        full_name: 'Admin Bits2Bytes',
        email: 'admin@b2b.id',
        created_at: yesterday,
      },
      {
        id: 'teacher-demo-1',
        role: 'teacher',
        full_name: 'Kak Budi Santoso',
        email: 'guru@b2b.id',
        created_at: yesterday,
      },
      {
        id: 'student-demo-1',
        role: 'student',
        full_name: 'Raka Pratama',
        email: '08123456789@student.mylms.app',
        created_at: yesterday,
      },
      {
        id: 'student-demo-2',
        role: 'student',
        full_name: 'Nadia Putri',
        email: '08987654321@student.mylms.app',
        created_at: yesterday,
      },
    ],
    students: [
      {
        id: 'student-demo-1',
        email_or_phone: '08123456789',
        full_name: 'Raka Pratama',
        grade: '5 SD',
        bio: 'Suka bikin game RPG di Scratch & Roblox!',
        mpin: '123456',
        avatar_id: 'dragon',
        title_id: 'coder',
        coins: 150,
        total_xp: 280,
        equipped_hat_id: 'hat-wizard',
        inventory: ['hat-wizard'],
        created_at: yesterday,
      },
      {
        id: 'student-demo-2',
        email_or_phone: '08987654321',
        full_name: 'Nadia Putri',
        grade: '6 SD',
        bio: 'Suka desain 3D dan animasi.',
        mpin: '123456',
        avatar_id: 'cat',
        title_id: null,
        coins: 90,
        total_xp: 160,
        equipped_hat_id: null,
        inventory: [],
        created_at: yesterday,
      },
    ],
    modules: [
      {
        id: 1,
        title: 'Scratch Game Development: Petualangan Luar Angkasa',
        description: encodeFinalAssessment(scratchFinalAssessment),
        level: 'beginner',
        gamification_type: 'mimo',
        is_active: true,
        created_at: yesterday,
      },
      {
        id: 2,
        title: 'Python Dasar untuk Anak: Misi Robot AI',
        description:
          'Mengenal sintaks Python, variabel, perulangan, dan fungsi melalui misi interaktif.',
        level: 'intermediate',
        gamification_type: 'mimo',
        is_active: true,
        created_at: yesterday,
      },
    ],
    topics: scratchTopicsData.map((t, idx) => ({
      id: 101 + idx,
      module_id: 1,
      title: t.topic_title,
      order_index: t.topic_order,
      description: t.description,
      project_link: t.project_link,
      topic_link: null,
      engine_topic_id: `topic-${101 + idx}`,
      lesson_content: {
        learningPath: t.nodes.map((n) => ({
          id: n.node_id,
          type: n.type,
          title: n.title,
          xp: n.xp,
          explanation: n.content,
          instructions: n.instructions,
          options: n.options,
          correctOption: n.correct_option,
          content: n.content,
          ...(n.code_content && {
            code: {
              language: n.code_language ?? 'scratch',
              content: n.code_content,
            },
          }),
        })),
        quiz: t.quiz,
      },
      status: 'published',
      published_at: yesterday,
      created_at: yesterday,
    })),
    student_modules: [
      { student_id: 'student-demo-1', module_id: 1, status: 'active' },
      { student_id: 'student-demo-2', module_id: 1, status: 'active' },
    ],
    meetings: scratchTopicsData.map((t, idx) => ({
      id: idx + 1,
      title: `Sesi ${idx + 1}: ${t.topic_title}`,
      meeting_date: idx === 0 ? yesterday : idx === 1 ? inTwoHours : nextWeek,
      link_url: 'https://zoom.us/j/123456789',
      notes: `Fokus materi: ${t.description.slice(0, 80)}...`,
      session_count: scratchTopicsData.length,
      session_number: idx + 1,
      series_id: 'series-scratch-1',
      teacher_id: 'teacher-demo-1',
      is_completed: idx === 0,
      completion_status: idx === 0 ? 'selesai' : null,
      progress_report:
        idx === 0
          ? 'Siswa berhasil menguasai materi koordinat panggung dan lulus kuis dengan nilai sempurna!'
          : null,
      created_at: yesterday,
    })),
    meeting_students: [
      {
        meeting_id: 1,
        student_id: 'student-demo-1',
        has_joined: true,
        attendance_status: 'hadir',
      },
      {
        meeting_id: 1,
        student_id: 'student-demo-2',
        has_joined: true,
        attendance_status: 'hadir',
      },
      {
        meeting_id: 2,
        student_id: 'student-demo-1',
        has_joined: true,
        attendance_status: 'hadir',
      },
      {
        meeting_id: 2,
        student_id: 'student-demo-2',
        has_joined: true,
        attendance_status: 'hadir',
      },
    ],
    quizzes: [],
    quiz_questions: [],
    quiz_attempts: [],
    topic_progress: [
      {
        id: 1,
        student_id: 'student-demo-1',
        topic_id: 101,
        engine_topic_id: 'topic-101',
        xp_earned: 50,
        best_quiz_score: 100,
        completed_at: yesterday,
      },
    ],
    student_pets: [
      {
        id: 1,
        student_id: 'student-demo-1',
        pet_name: 'Draco',
        species_id: 'dragon',
        stage: 'BABY_PET',
        hatch_progress: 100,
        logic_data: 40,
        creative_data: 35,
        spatial_data: 25,
        created_at: yesterday,
      },
    ],
    student_badges: [],
    parent_links: [
      {
        id: 'plink-1',
        token: 'demo-parent-token',
        student_id: 'student-demo-1',
        expires_at: nextWeek,
        invoice_id: 'inv-demo-1',
        created_at: yesterday,
      },
    ],
    announcements: [
      {
        id: 'ann-1',
        title: '🚀 Pembaruan Platform Bits2Bytes',
        content:
          'Selamat datang di antarmuka baru Bits2Bytes! Nikmati navigasi cepat, jadwal kelas otomatis, dan pemantauan invoice transparan.',
        target: 'all',
        urgency: 'info',
        image_url: null,
        expires_at: null,
        created_at: yesterday,
        is_active: true,
      },
      {
        id: 'ann-2',
        title: '⚠️ Pengingat Jadwal Kelas & Presensi',
        content:
          'Untuk para Guru dan Siswa, harap pastikan hadir tepat waktu sesuai jam sesi dan melakukan check-in presensi.',
        target: 'all',
        urgency: 'warning',
        image_url: null,
        expires_at: null,
        created_at: yesterday,
        is_active: true,
      },
    ],
    module_assessments: [],
    module_assessment_questions: [],
    module_assessment_attempts: [],
    topic_quiz_attempts: [
      {
        id: 1,
        student_id: 'student-demo-1',
        topic_id: 101,
        attempt_num: 1,
        score: 100,
        answers: [
          { question_index: 0, chosen_index: 0 },
          { question_index: 1, chosen_index: 0 },
        ],
        submitted_at: yesterday,
      },
    ],
    certificates: [],
    challenges: scratchTopicsData.map((t, idx) => ({
      id: idx + 1,
      topic_id: 101 + idx,
      title: t.challenge.title,
      instructions: t.challenge.instructions,
      order_index: 1,
      allows_file_upload: false,
      created_at: yesterday,
    })),
    challenge_submissions: [
      {
        id: 1,
        challenge_id: 1,
        student_id: 'student-demo-1',
        submission_url: 'https://scratch.mit.edu/projects/123456',
        submission_note:
          'Sudah selesai kak, saya tambahkan efek suara laser juga!',
        status: 'approved',
        review_note:
          'Keren banget Raka! Gerakannya halus dan ada suara lasernya.',
        reviewed_by: 'teacher-demo-1',
        reviewed_at: yesterday,
        submitted_at: yesterday,
        created_at: yesterday,
      },
    ],
    invoices: [
      {
        id: 'inv-demo-1',
        student_id: 'student-demo-1',
        month_year: prevMonthYear,
        total_meetings: 4,
        attended_meetings: 4,
        price_per_meeting: 125000,
        total_amount: 500000,
        bank_account: 'BCA 1234567890 a/n Bits2Bytes Edukasi',
        status: 'paid',
        created_at: yesterday,
      },
      {
        id: 'inv-demo-2',
        student_id: 'student-demo-2',
        month_year: currentMonthYear,
        total_meetings: 4,
        attended_meetings: 2,
        price_per_meeting: 125000,
        total_amount: 250000,
        bank_account: 'BCA 1234567890 a/n Bits2Bytes Edukasi',
        status: 'draft',
        created_at: yesterday,
      },
    ],
  };
}

export function getMockStore(): MockStore {
  if (!globalForMock.__b2bMockStore) {
    globalForMock.__b2bMockStore = createInitialMockStore();
  }
  return globalForMock.__b2bMockStore;
}

export function isSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const anon = getSupabaseAnonKey();
  return Boolean(url.startsWith('http') && isValidSupabaseKey(anon));
}

export function isValidServiceRoleJwt(raw?: string): boolean {
  const k = sanitizeEnvVal(raw ?? getSupabaseServiceRoleKey());
  if (!k) return false;
  if (globalForMock.__b2bInvalidKeys?.has(k)) return false;
  return (
    (k.startsWith('eyJ') && k.split('.').length === 3 && k.length > 80) ||
    (k.startsWith('sb_secret_') && k.length > 20)
  );
}

export function isSupabaseAdminConfigured(): boolean {
  const url = getSupabaseUrl();
  return Boolean(url.startsWith('http') && isValidServiceRoleJwt());
}

export function matchMockUserCredentials(
  email: string,
  password?: string
): MockUser | null {
  const store = getMockStore();
  const lower = email.toLowerCase().trim();
  const normalizedEmail =
    lower === '081234567890@student.mylms.app'
      ? '08123456789@student.mylms.app'
      : lower;
  const user = store.users.find(
    (u) => u.email.toLowerCase() === normalizedEmail
  );
  if (!user) return null;
  if (user.password && password === user.password) return user;
  if (
    normalizedEmail === 'admin@b2b.id' &&
    (password === 'password123' || password === 'admin123')
  )
    return user;
  if (
    normalizedEmail === 'guru@b2b.id' &&
    (password === 'password123' || password === 'guru123')
  )
    return user;
  return null;
}

function enrichRow(
  table: string,
  row: MockRow,
  selectStr: string,
  store: MockStore
): MockRow {
  const copy: MockRow = { ...row };

  if (table === 'meetings' && selectStr.includes('meeting_students')) {
    const msRows = store.meeting_students
      .filter((ms) => ms.meeting_id === row.id)
      .map((ms) => {
        const student =
          store.students.find((s) => s.id === ms.student_id) ?? null;
        return {
          ...ms,
          students: student ? { ...student } : null,
        };
      });
    copy.meeting_students = msRows;
  }

  if (table === 'meeting_students') {
    if (selectStr.includes('students')) {
      copy.students =
        store.students.find((s) => s.id === row.student_id) ?? null;
    }
    if (selectStr.includes('meetings')) {
      copy.meetings =
        store.meetings.find((m) => m.id === row.meeting_id) ?? null;
    }
  }

  if (table === 'students' && selectStr.includes('student_modules')) {
    copy.student_modules = store.student_modules
      .filter((sm) => sm.student_id === row.id)
      .map((sm) => ({
        ...sm,
        modules: store.modules.find((m) => m.id === sm.module_id) ?? null,
      }));
  }

  if (table === 'student_modules' && selectStr.includes('modules')) {
    copy.modules = store.modules.find((m) => m.id === row.module_id) ?? null;
  }

  if (table === 'invoices' && selectStr.includes('students')) {
    copy.students = store.students.find((s) => s.id === row.student_id) ?? null;
  }

  if (table === 'certificates' && selectStr.includes('modules')) {
    copy.modules = store.modules.find((m) => m.id === row.module_id) ?? null;
  }

  if (table === 'topic_progress' && selectStr.includes('topics')) {
    copy.topics = store.topics.find((t) => t.id === row.topic_id) ?? null;
  }

  return copy;
}

class MockQueryBuilder {
  private table: string;
  private store: MockStore;
  private op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private selectStr = '*';
  private countExact = false;
  private headOnly = false;
  private filters: Array<(row: MockRow) => boolean> = [];
  private orderByField: string | null = null;
  private orderAsc = true;
  private rangeBounds: [number, number] | null = null;
  private limitCount: number | null = null;
  private returnSingle = false;
  private returnMaybeSingle = false;
  private payload: unknown = null;
  private upsertConflict: string | null = null;

  constructor(table: string, store: MockStore) {
    this.table = table;
    this.store = store;
  }

  select(columns = '*', opts?: { count?: 'exact'; head?: boolean }) {
    this.selectStr = columns;
    if (opts?.count === 'exact') this.countExact = true;
    if (opts?.head) this.headOnly = true;
    return this;
  }

  insert(values: unknown) {
    this.op = 'insert';
    this.payload = values;
    return this;
  }

  update(values: unknown) {
    this.op = 'update';
    this.payload = values;
    return this;
  }

  upsert(values: unknown, opts?: { onConflict?: string }) {
    this.op = 'upsert';
    this.payload = values;
    this.upsertConflict = opts?.onConflict ?? null;
    return this;
  }

  delete() {
    this.op = 'delete';
    return this;
  }

  eq(col: string, val: unknown) {
    this.filters.push((row) => {
      if (col.includes('.')) {
        const [rel, field] = col.split('.');
        const relVal = row[rel];
        if (Array.isArray(relVal)) {
          return relVal.some((item) => (item as MockRow)?.[field] === val);
        }
        return (relVal as MockRow | undefined)?.[field] === val;
      }
      return row[col] === val;
    });
    return this;
  }

  in(col: string, vals: unknown[]) {
    this.filters.push((row) => vals.includes(row[col]));
    return this;
  }

  gt(col: string, val: string | number) {
    this.filters.push((row) => {
      const rVal = row[col] as string | number;
      return rVal > val;
    });
    return this;
  }

  gte(col: string, val: string | number) {
    this.filters.push((row) => {
      const rVal = row[col] as string | number;
      return rVal >= val;
    });
    return this;
  }

  lt(col: string, val: string | number) {
    this.filters.push((row) => {
      const rVal = row[col] as string | number;
      return rVal < val;
    });
    return this;
  }

  lte(col: string, val: string | number) {
    this.filters.push((row) => {
      const rVal = row[col] as string | number;
      return rVal <= val;
    });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderByField = col;
    this.orderAsc = opts?.ascending ?? true;
    return this;
  }

  range(from: number, to: number) {
    this.rangeBounds = [from, to];
    return this;
  }

  limit(n: number) {
    this.limitCount = n;
    return this;
  }

  single() {
    this.returnSingle = true;
    return this;
  }

  maybeSingle() {
    this.returnMaybeSingle = true;
    return this;
  }

  private execute(): {
    data: unknown;
    error: null | { message: string };
    count?: number;
  } {
    if (!this.store[this.table]) {
      this.store[this.table] = [];
    }
    const tableArr = this.store[this.table] as MockRow[];

    if (this.op === 'insert') {
      const rawItems = Array.isArray(this.payload)
        ? this.payload
        : [this.payload];
      const inserted = rawItems.map((item) => {
        const row: MockRow = { ...(item as MockRow) };
        if (row.id === undefined) {
          if (this.table === 'parent_links' || this.table === 'invoices') {
            row.id = crypto.randomUUID();
          } else {
            const maxId = tableArr.reduce(
              (m, r) => (typeof r.id === 'number' && r.id > m ? r.id : m),
              0
            );
            row.id = maxId + 1;
          }
        }
        if (this.table === 'parent_links' && !row.token) {
          row.token = crypto.randomUUID();
          row.expires_at = new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString();
        }
        if (!row.created_at) {
          row.created_at = new Date().toISOString();
        }
        tableArr.push(row);
        return row;
      });
      const data =
        this.returnSingle || this.returnMaybeSingle
          ? (inserted[0] ?? null)
          : inserted;
      return { data, error: null };
    }

    if (this.op === 'upsert') {
      const rawItems = Array.isArray(this.payload)
        ? this.payload
        : [this.payload];
      const conflictCols = this.upsertConflict
        ? this.upsertConflict.split(',').map((s) => s.trim())
        : ['id'];
      const results = rawItems.map((rawItem) => {
        const item = rawItem as MockRow;
        const idx = tableArr.findIndex((r) =>
          conflictCols.every((c) => r[c] === item[c])
        );
        if (idx >= 0) {
          tableArr[idx] = { ...tableArr[idx], ...item };
          return tableArr[idx];
        } else {
          const newRow: MockRow = {
            ...item,
            created_at: new Date().toISOString(),
          };
          tableArr.push(newRow);
          return newRow;
        }
      });
      const data =
        this.returnSingle || this.returnMaybeSingle
          ? (results[0] ?? null)
          : results;
      return { data, error: null };
    }

    if (this.op === 'update') {
      const matched: MockRow[] = [];
      for (let i = 0; i < tableArr.length; i++) {
        const enriched = enrichRow(
          this.table,
          tableArr[i],
          this.selectStr,
          this.store
        );
        if (this.filters.every((f) => f(enriched))) {
          tableArr[i] = { ...tableArr[i], ...(this.payload as MockRow) };
          matched.push(tableArr[i]);
        }
      }
      const data =
        this.returnSingle || this.returnMaybeSingle
          ? (matched[0] ?? null)
          : matched;
      return { data, error: null };
    }

    if (this.op === 'delete') {
      const remaining: MockRow[] = [];
      for (const row of tableArr) {
        const enriched = enrichRow(this.table, row, this.selectStr, this.store);
        if (!this.filters.every((f) => f(enriched))) {
          remaining.push(row);
        }
      }
      this.store[this.table] = remaining;
      return { data: null, error: null };
    }

    // SELECT
    let rows = tableArr.map((r) =>
      enrichRow(this.table, r, this.selectStr, this.store)
    );
    rows = rows.filter((r) => this.filters.every((f) => f(r)));

    const totalCount = rows.length;

    if (this.orderByField) {
      const field = this.orderByField;
      const dir = this.orderAsc ? 1 : -1;
      rows.sort((a, b) => {
        const rawA = a[field];
        const rawB = b[field];
        if (typeof rawA === 'number' && typeof rawB === 'number') {
          return (rawA - rawB) * dir;
        }
        const va = String(rawA ?? '');
        const vb = String(rawB ?? '');
        if (va < vb) return -1 * dir;
        if (va > vb) return 1 * dir;
        return 0;
      });
    }

    if (this.rangeBounds) {
      const [from, to] = this.rangeBounds;
      rows = rows.slice(from, to + 1);
    }

    if (this.limitCount !== null) {
      rows = rows.slice(0, this.limitCount);
    }

    if (this.headOnly) {
      return { data: null, error: null, count: totalCount };
    }

    if (this.returnSingle || this.returnMaybeSingle) {
      return { data: rows[0] ?? null, error: null, count: totalCount };
    }

    return { data: rows, error: null, count: totalCount };
  }

  then<
    TResult1 = {
      data: unknown;
      error: null | { message: string };
      count?: number;
    },
    TResult2 = never,
  >(
    onfulfilled?:
      | ((value: {
          data: unknown;
          error: null | { message: string };
          count?: number;
        }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    try {
      const res = this.execute();
      return Promise.resolve(res).then(onfulfilled, onrejected);
    } catch (err) {
      return Promise.reject(err).then(onfulfilled, onrejected);
    }
  }
}

export const MOCK_SESSION_COOKIE = 'b2b_mock_user_id';

export function createMockSupabaseClient(options?: {
  getCookie?: (name: string) => string | undefined;
  setCookie?: (name: string, value: string) => void;
  deleteCookie?: (name: string) => void;
}) {
  const store = getMockStore();

  return {
    async rpc(functionName: string, args: Record<string, unknown>) {
      if (functionName !== 'save_meeting_report') {
        return {
          data: null,
          error: { message: `Unknown mock function: ${functionName}` },
        };
      }

      const meetingId = Number(args.p_meeting_id);
      const meeting = store.meetings.find(
        (row) => Number(row.id) === meetingId
      );
      const markCompleted = args.p_mark_completed === true;
      if (!meeting || (!markCompleted && meeting.is_completed !== true)) {
        return {
          data: null,
          error: { message: 'Meeting not found or is not completed' },
        };
      }

      const attendance = args.p_attendance;
      if (!Array.isArray(attendance)) {
        return {
          data: null,
          error: { message: 'Attendance must be an array' },
        };
      }

      const roster = store.meeting_students.filter(
        (row) => Number(row.meeting_id) === meetingId
      );
      const updates = attendance as Array<{
        student_id?: unknown;
        status?: unknown;
      }>;
      const seen = new Set<string>();
      for (const item of updates) {
        const studentId = String(item.student_id ?? '');
        if (
          !studentId ||
          !['hadir', 'telat', 'absen'].includes(String(item.status))
        ) {
          return {
            data: null,
            error: {
              message: 'Attendance contains an invalid student or status',
            },
          };
        }
        seen.add(studentId);
      }
      if (updates.length !== roster.length || seen.size !== roster.length) {
        return {
          data: null,
          error: {
            message: 'Attendance must include every student exactly once',
          },
        };
      }
      if (roster.some((row) => !seen.has(String(row.student_id)))) {
        return {
          data: null,
          error: { message: 'Attendance does not match the meeting roster' },
        };
      }

      for (const item of updates) {
        const studentId = String(item.student_id);
        const status = String(item.status);
        const row = roster.find(
          (entry) => String(entry.student_id) === studentId
        );
        if (row) {
          row.attendance_status = status;
          row.has_joined = status !== 'absen';
        }
      }

      meeting.progress_report = String(args.p_progress_report ?? '');
      if (markCompleted) {
        meeting.is_completed = true;
        meeting.completion_status = String(
          args.p_completion_status ?? 'selesai'
        );
      }
      return { data: null, error: null };
    },
    from(table: string) {
      return new MockQueryBuilder(table, store);
    },
    auth: {
      async getUser() {
        const userId = options?.getCookie?.(MOCK_SESSION_COOKIE);
        const user = store.users.find((u) => u.id === userId) ?? null;
        return { data: { user }, error: null };
      },
      async signInWithPassword({
        email,
      }: {
        email: string;
        password?: string;
      }) {
        const lower = email.toLowerCase().trim();
        let user = store.users.find((u) => u.email.toLowerCase() === lower);

        if (!user) {
          if (lower.includes('admin')) {
            user = store.users.find((u) => u.user_metadata.role === 'admin');
          } else if (lower.includes('guru') || lower.includes('teacher')) {
            user = store.users.find((u) => u.user_metadata.role === 'teacher');
          } else if (lower.includes('student') || lower.includes('siswa')) {
            user = store.users.find((u) => u.user_metadata.role === 'student');
          }
        }

        if (!user) {
          return {
            data: { user: null, session: null },
            error: { message: 'Invalid login credentials' },
          };
        }

        options?.setCookie?.(MOCK_SESSION_COOKIE, user.id);
        return {
          data: { user, session: { access_token: 'mock-token', user } },
          error: null,
        };
      },
      async signOut() {
        options?.deleteCookie?.(MOCK_SESSION_COOKIE);
        return { error: null };
      },
      async updateUser(attrs: {
        data?: Record<string, unknown>;
        password?: string;
      }) {
        const userId = options?.getCookie?.(MOCK_SESSION_COOKIE);
        const user = store.users.find((u) => u.id === userId) ?? null;
        if (!user)
          return { data: { user: null }, error: { message: 'User not found' } };
        if (attrs.data) {
          user.user_metadata = { ...user.user_metadata, ...attrs.data };
        }
        if (attrs.password) {
          user.password = attrs.password;
        }
        return { data: { user }, error: null };
      },
      async exchangeCodeForSession() {
        return { data: { session: null }, error: null };
      },
      admin: {
        async listUsers() {
          return { data: { users: store.users }, error: null };
        },
        async createUser(attrs: {
          email: string;
          password?: string;
          email_confirm?: boolean;
          user_metadata?: Record<string, unknown>;
        }) {
          const exists = store.users.some(
            (u) => u.email.toLowerCase() === attrs.email.toLowerCase()
          );
          if (exists) {
            return {
              data: { user: null },
              error: { message: 'User already been registered' },
            };
          }
          const newUser: MockUser = {
            id: crypto.randomUUID(),
            email: attrs.email,
            password: attrs.password,
            user_metadata: (attrs.user_metadata ??
              {}) as MockUser['user_metadata'],
          };
          store.users.push(newUser);
          return { data: { user: newUser }, error: null };
        },
        async updateUserById(
          id: string,
          attrs: { user_metadata?: Record<string, unknown>; password?: string }
        ) {
          const user = store.users.find((u) => u.id === id);
          if (!user)
            return {
              data: { user: null },
              error: { message: 'User not found' },
            };
          if (attrs.user_metadata) {
            user.user_metadata = {
              ...user.user_metadata,
              ...attrs.user_metadata,
            };
          }
          if (attrs.password) {
            user.password = attrs.password;
          }
          return { data: { user }, error: null };
        },
        async deleteUser(id: string) {
          store.users = store.users.filter((u) => u.id !== id);
          return { data: { user: null }, error: null };
        },
      },
    },
  };
}
