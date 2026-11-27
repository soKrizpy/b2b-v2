// src/types/database.ts
// Hand-authored types that mirror the existing production Supabase schema.
// Covers every table that the rebuild reads or writes.
// NEVER destructively alter the corresponding production tables.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];
import type { AttendanceStatus } from './sessions';

// ── Row types ────────────────────────────────────────────────────────────────
// Each "Row" type is the shape returned by SELECT *.
// "Insert" omits server-generated fields; "Update" makes all fields optional.

// public.profiles  (role lives here — NOT in public.users / auth.users metadata)
export interface ProfileRow {
  id: string; // uuid — matches auth.users.id
  role: 'admin' | 'teacher' | 'student';
  full_name: string | null;
  email?: string | null;
  created_at: string | null;
}

export interface EquippedCosmetics {
  archetype?: string; // 'cyber-mage' | 'astral-knight' | 'shadow-glitcher' | 'chrono-alchemist'
  skinTone?: string; // 'default' | 'fair' | 'tan' | 'dark'
  hatId?: string | null;
  outfitId?: string | null;
  auraId?: string | null;
  petId?: string | null; // 'cat' | 'fox' | 'dragon' | 'robot' | 'bunny' | 'owl' | 'dog'
  petHatId?: string | null;
  titleId?: string | null;
}

// public.students
export interface StudentRow {
  id: string; // uuid — matches auth.users.id
  email_or_phone: string;
  full_name: string;
  grade: string | null;
  bio: string | null;
  mpin: string;
  avatar_id: string | null;
  title_id: string | null;
  coins: number;
  total_xp: number;
  equipped_hat_id: string | null;
  equipped_cosmetics?: EquippedCosmetics | Json | null;
  inventory: string[];
  created_at: string | null;
}
export type StudentInsert = Omit<
  StudentRow,
  'coins' | 'inventory' | 'created_at'
> & {
  coins?: number;
  inventory?: string[];
};
export type StudentUpdate = Partial<Omit<StudentRow, 'id' | 'created_at'>>;

// public.modules
export interface ModuleRow {
  id: number;
  title: string | null;
  description: string | null;
  level: string | null;
  gamification_type: string | null;
  final_assessment?: Json | null;
  is_active: boolean | null;
  created_at: string | null;
}
export type ModuleInsert = Omit<ModuleRow, 'id' | 'created_at'>;
export type ModuleUpdate = Partial<ModuleInsert>;

// public.topics
export interface TopicRow {
  id: number;
  module_id: number;
  title: string;
  order_index: number;
  description: string | null;
  project_link: string | null;
  topic_link: string | null;
  engine_topic_id: string | null;
  lesson_content: Json | null;
  status: 'draft' | 'published' | null;
  published_at: string | null;
  created_at: string | null;
}
export type TopicInsert = Omit<TopicRow, 'id' | 'published_at' | 'created_at'>;
export type TopicUpdate = Partial<Omit<TopicRow, 'id' | 'created_at'>>;

// public.student_modules
export interface StudentModuleRow {
  student_id: string;
  module_id: number;
  status: 'active' | 'paused';
}
export type StudentModuleInsert = StudentModuleRow;
export type StudentModuleUpdate = Pick<StudentModuleRow, 'status'>;

// public.meetings  (the production table name — not "sessions")
export interface MeetingRow {
  id: number;
  title: string;
  meeting_date: string; // timestamptz as ISO string
  link_url: string;
  notes: string | null;
  session_count: number;
  session_number: number;
  series_id: string | null;
  module_id: number | null; // FK → modules.id; NULL only for unassociated legacy meetings
  topic_id: number | null; // FK → topics.id; NULL for legacy/general meetings without a curriculum topic
  teacher_id: string | null; // uuid FK → profiles.id (added in migration 0007)
  is_completed: boolean;
  completion_status: string | null;
  progress_report: string | null;
  created_at: string | null;
}
// MeetingInsert — teacher_id optional (nullable; existing rows stay valid).
export type MeetingInsert = {
  title: string;
  meeting_date: string; // ISO 8601
  link_url: string | null;
  notes: string | null;
  session_count: number;
  session_number: number;
  series_id: string | null;
  module_id: number;
  topic_id?: number | null;
  teacher_id?: string | null;
  is_completed?: boolean;
};
export type MeetingUpdate = Partial<Omit<MeetingRow, 'id' | 'created_at'>>;

// public.meeting_students  (join table — maps meetings to students)
export interface MeetingStudentRow {
  meeting_id: number;
  student_id: string;
  has_joined: boolean;
  attendance_status: AttendanceStatus;
}
export type MeetingStudentInsert = Omit<
  MeetingStudentRow,
  'attendance_status'
> & {
  attendance_status?: AttendanceStatus;
};

// public.quizzes
export interface QuizRow {
  id: number;
  topic_id: number;
  title: string | null;
  source: 'manual' | 'csv' | 'engine' | null;
  created_at: string | null;
}

// public.quiz_questions
export interface QuizQuestionRow {
  id: number;
  quiz_id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'A' | 'B' | 'C' | 'D';
  created_at: string | null;
}

// public.quiz_attempts
export interface QuizAttemptRow {
  id: number;
  student_id: string;
  quiz_id: number;
  score: number;
  total_questions: number;
  attempts_count: number;
  created_at: string;
}

// public.topic_progress  (engine lesson completions)
export interface TopicProgressRow {
  id: number;
  student_id: string;
  topic_id: number;
  engine_topic_id: string;
  xp_earned: number;
  best_quiz_score: number;
  completed_at: string;
}

// public.student_pets  (Cyber Pet companion)
export interface StudentPetRow {
  id: number;
  student_id: string;
  pet_name: string | null;
  species_id: string | null;
  stage: 'EGG' | 'READY_TO_HATCH' | 'BABY_PET';
  hatch_progress: number; // 0–100
  logic_data: number;
  creative_data: number;
  spatial_data: number;
  created_at: string | null;
}
export type StudentPetInsert = Omit<StudentPetRow, 'id' | 'created_at'>;
export type StudentPetUpdate = Partial<
  Omit<StudentPetRow, 'id' | 'student_id' | 'created_at'>
>;

// public.student_badges
export interface StudentBadgeRow {
  id: number;
  student_id: string;
  badge_id: string;
  earned_at: string;
}

// public.parent_links
export interface ParentLinkRow {
  id: string; // uuid
  token: string; // unique random token
  student_id: string;
  expires_at: string; // timestamptz
  invoice_id: string | null; // optional link to an invoice row
  created_at: string | null;
}
export type ParentLinkInsert = Omit<ParentLinkRow, 'created_at'>;

// public.announcements
export interface AnnouncementRow {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  target: 'all' | 'students' | 'teachers';
  urgency: 'info' | 'warning' | 'urgent';
  expires_at: string | null;
  is_active: boolean;
  created_at: string | null;
}

// public.module_assessments
export interface ModuleAssessmentRow {
  id: number;
  module_id: number;
  title: string;
  created_at: string;
}

// public.module_assessment_questions
export interface ModuleAssessmentQuestionRow {
  id: number;
  assessment_id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'A' | 'B' | 'C' | 'D';
  order_index: number;
  created_at: string;
}

// public.module_assessment_attempts
export interface ModuleAssessmentAttemptRow {
  id: number;
  student_id: string;
  assessment_id: number;
  attempt_number: 1 | 2;
  score: number;
  best_score: number;
  total_questions: number;
  correct_count: number;
  answers: Record<string, 'A' | 'B' | 'C' | 'D' | null>; // null = unanswered
  submitted_at: string;
}

// ── Invoices (production table — already exists, additive reference) ─────────
// Billing is post-paid: attended_meetings × price_per_meeting = total_amount.
// Attendance is determined by meeting_students.has_joined = true.
export interface InvoiceRow {
  id: string; // uuid
  student_id: string;
  month_year: string; // "YYYY-MM"
  total_meetings: number;
  attended_meetings: number;
  price_per_meeting: number;
  total_amount: number;
  bank_account: string | null;
  status: 'draft' | 'sent' | 'paid';
  created_at: string | null;
}

// ── Phase 5: Topic Quiz Attempts ─────────────────────────────────────────────

export interface QuizAnswer {
  question_index: number;
  chosen_index: number;
}

export interface TopicQuizAttemptRow {
  id: number;
  student_id: string;
  topic_id: number;
  attempt_num: 1 | 2;
  score: number; // 0–100
  answers: QuizAnswer[]; // JSONB
  submitted_at: string;
  reward_claimed_at: string | null;
}

// ── Phase 5: Certificates ─────────────────────────────────────────────────────

export type CertificateTier = 'achievement' | 'excellent' | 'completion';

export interface CertificateRow {
  id: number;
  student_id: string;
  module_id: number;
  score: number;
  tier: CertificateTier;
  certificate_number: string;
  verification_token: string;
  learning_record: Json | null;
  issued_at: string;
  issue_source: 'assessment' | 'manual';
  issued_by: string | null;
  admin_note: string | null;
}
export interface StudentAssessmentUnlockRow {
  student_id: string;
  module_id: number;
  unlocked_by: string | null;
  reason: string;
  created_at: string;
}
export type CertificateInsert = Omit<
  CertificateRow,
  'id' | 'issued_at' | 'verification_token' | 'issue_source' | 'issued_by' | 'admin_note' | 'learning_record'
> & Partial<Pick<CertificateRow, 'issue_source' | 'issued_by' | 'admin_note' | 'learning_record'>>;

// ── Phase 2: Challenges & Submissions (new tables — additive) ────────────────

// public.challenges
// Challenges belong to a topic and describe a task the student must complete.
export interface ChallengeRow {
  id: number;
  topic_id: number; // FK → topics(id)
  title: string;
  instructions: string | null;
  order_index: number;
  allows_file_upload: boolean; // true = accepts file; false = URL-only
  created_at: string | null;
}
export type ChallengeInsert = Omit<ChallengeRow, 'id' | 'created_at'>;
export type ChallengeUpdate = Partial<Omit<ChallengeRow, 'id' | 'created_at'>>;

// public.challenge_submissions
export type SubmissionStatus = 'pending' | 'approved' | 'needs_revision';

export interface SubmissionRow {
  id: number;
  challenge_id: number; // FK → challenges(id)
  student_id: string; // FK → auth.users(id)
  submission_url: string | null; // URL proof (link or uploaded file URL)
  submission_note: string | null;
  status: SubmissionStatus;
  review_note: string | null; // teacher feedback on rejection/revision
  reviewed_by: string | null; // teacher user id
  reviewed_at: string | null;
  submitted_at: string;
  created_at: string | null;
}
export type SubmissionInsert = Omit<
  SubmissionRow,
  'id' | 'status' | 'review_note' | 'reviewed_by' | 'reviewed_at' | 'created_at'
> & { status?: SubmissionStatus };
export type SubmissionUpdate = Partial<
  Omit<SubmissionRow, 'id' | 'student_id' | 'challenge_id' | 'created_at'>
>;

// public.teacher_students
// ── Supabase Database generic type ───────────────────────────────────────────
// Used to parameterise the Supabase client — enables typed .from() calls.

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          content: string
          created_at: string
          duration_days: number
          expires_at: string
          id: number
          image_url: string | null
          is_active: boolean
          target: string
          title: string
          urgency: string
        }
        Insert: {
          content: string
          created_at?: string
          duration_days?: number
          expires_at: string
          id?: number
          image_url?: string | null
          is_active?: boolean
          target?: string
          title?: string
          urgency?: string
        }
        Update: {
          content?: string
          created_at?: string
          duration_days?: number
          expires_at?: string
          id?: number
          image_url?: string | null
          is_active?: boolean
          target?: string
          title?: string
          urgency?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          admin_note: string | null
          certificate_number: string
          id: number
          issue_source: string
          issued_at: string
          issued_by: string | null
          learning_record: Json | null
          module_id: number
          score: number
          student_id: string
          tier: string
          verification_token: string
        }
        Insert: {
          admin_note?: string | null
          certificate_number: string
          id?: number
          issue_source?: string
          issued_at?: string
          issued_by?: string | null
          learning_record?: Json | null
          module_id: number
          score: number
          student_id: string
          tier: string
          verification_token?: string
        }
        Update: {
          admin_note?: string | null
          certificate_number?: string
          id?: number
          issue_source?: string
          issued_at?: string
          issued_by?: string | null
          learning_record?: Json | null
          module_id?: number
          score?: number
          student_id?: string
          tier?: string
          verification_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_submissions: {
        Row: {
          challenge_id: number
          created_at: string
          id: number
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          student_id: string
          submission_note: string | null
          submission_url: string | null
          submitted_at: string
        }
        Insert: {
          challenge_id: number
          created_at?: string
          id?: number
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_id: string
          submission_note?: string | null
          submission_url?: string | null
          submitted_at?: string
        }
        Update: {
          challenge_id?: number
          created_at?: string
          id?: number
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_id?: string
          submission_note?: string | null
          submission_url?: string | null
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_submissions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          allows_file_upload: boolean
          created_at: string
          id: number
          instructions: string | null
          order_index: number
          title: string
          topic_id: number
        }
        Insert: {
          allows_file_upload?: boolean
          created_at?: string
          id?: number
          instructions?: string | null
          order_index?: number
          title: string
          topic_id: number
        }
        Update: {
          allows_file_upload?: boolean
          created_at?: string
          id?: number
          instructions?: string | null
          order_index?: number
          title?: string
          topic_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "challenges_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      engine_progress: {
        Row: {
          achievement: string | null
          best_quiz_score: number | null
          completed_nodes: string[] | null
          current_node_index: number | null
          last_updated: string | null
          quiz_attempts: Json | null
          student_id: string
          topic_completed: boolean | null
          topic_id: string
          xp_awarded_for_completion: boolean | null
          xp_earned: number | null
        }
        Insert: {
          achievement?: string | null
          best_quiz_score?: number | null
          completed_nodes?: string[] | null
          current_node_index?: number | null
          last_updated?: string | null
          quiz_attempts?: Json | null
          student_id: string
          topic_completed?: boolean | null
          topic_id: string
          xp_awarded_for_completion?: boolean | null
          xp_earned?: number | null
        }
        Update: {
          achievement?: string | null
          best_quiz_score?: number | null
          completed_nodes?: string[] | null
          current_node_index?: number | null
          last_updated?: string | null
          quiz_attempts?: Json | null
          student_id?: string
          topic_completed?: boolean | null
          topic_id?: string
          xp_awarded_for_completion?: boolean | null
          xp_earned?: number | null
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          created_at: string | null
          id: number
          module_id: number
          status: string
          student_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          module_id: number
          status?: string
          student_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          module_id?: number
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      game_items: {
        Row: {
          created_at: string | null
          description: string | null
          icon_url: string | null
          id: string
          item_type: string
          name: string
          price_coins: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon_url?: string | null
          id: string
          item_type: string
          name: string
          price_coins?: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          item_type?: string
          name?: string
          price_coins?: number
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          invoice_id: string
          meeting_id: number | null
          session_date: string | null
          session_number: number | null
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string
          id?: string
          invoice_id: string
          meeting_id?: number | null
          session_date?: string | null
          session_number?: number | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          meeting_id?: number | null
          session_date?: string | null
          session_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          notes: string
          paid_at: string
          payment_method: string
          recorded_by: string
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          notes?: string
          paid_at?: string
          payment_method?: string
          recorded_by: string
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          notes?: string
          paid_at?: string
          payment_method?: string
          recorded_by?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          additional_charges: number
          adjustment_note: string
          attended_meetings: number
          bank_account: string | null
          created_at: string | null
          created_by: string | null
          currency: string
          discount_amount: number
          id: string
          issued_at: string | null
          issued_by: string | null
          month_year: string
          paid_at: string | null
          price_per_meeting: number
          status: string | null
          student_id: string | null
          total_amount: number
          total_meetings: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          additional_charges?: number
          adjustment_note?: string
          attended_meetings?: number
          bank_account?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          discount_amount?: number
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          month_year: string
          paid_at?: string | null
          price_per_meeting?: number
          status?: string | null
          student_id?: string | null
          total_amount?: number
          total_meetings?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          additional_charges?: number
          adjustment_note?: string
          attended_meetings?: number
          bank_account?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          discount_amount?: number
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          month_year?: string
          paid_at?: string | null
          price_per_meeting?: number
          status?: string | null
          student_id?: string | null
          total_amount?: number
          total_meetings?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_students: {
        Row: {
          attendance_recorded_at: string | null
          attendance_recorded_by: string | null
          attendance_status: string
          created_at: string
          has_joined: boolean
          id: number
          meeting_id: number
          student_id: string
        }
        Insert: {
          attendance_recorded_at?: string | null
          attendance_recorded_by?: string | null
          attendance_status?: string
          created_at?: string
          has_joined?: boolean
          id?: number
          meeting_id: number
          student_id: string
        }
        Update: {
          attendance_recorded_at?: string | null
          attendance_recorded_by?: string | null
          attendance_status?: string
          created_at?: string
          has_joined?: boolean
          id?: number
          meeting_id?: number
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_students_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completion_status: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          duration_minutes: number
          id: number
          is_completed: boolean | null
          link_url: string | null
          meeting_date: string
          module_id: number | null
          notes: string | null
          progress_report: string | null
          replacement_for_session_id: number | null
          replacement_required: boolean
          replacement_session_id: number | null
          series_id: string | null
          session_count: number | null
          session_number: number | null
          teacher_id: string | null
          title: string
          topic_id: number | null
          updated_at: string
          version: number
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completion_status?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          duration_minutes?: number
          id?: number
          is_completed?: boolean | null
          link_url?: string | null
          meeting_date: string
          module_id?: number | null
          notes?: string | null
          progress_report?: string | null
          replacement_for_session_id?: number | null
          replacement_required?: boolean
          replacement_session_id?: number | null
          series_id?: string | null
          session_count?: number | null
          session_number?: number | null
          teacher_id?: string | null
          title: string
          topic_id?: number | null
          updated_at?: string
          version?: number
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completion_status?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          duration_minutes?: number
          id?: number
          is_completed?: boolean | null
          link_url?: string | null
          meeting_date?: string
          module_id?: number | null
          notes?: string | null
          progress_report?: string | null
          replacement_for_session_id?: number | null
          replacement_required?: boolean
          replacement_session_id?: number | null
          series_id?: string | null
          session_count?: number | null
          session_number?: number | null
          teacher_id?: string | null
          title?: string
          topic_id?: number | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "meetings_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_replacement_for_session_id_fkey"
            columns: ["replacement_for_session_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_replacement_session_id_fkey"
            columns: ["replacement_session_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      module_assessment_attempts: {
        Row: {
          answers: Json
          assessment_id: number
          attempt_number: number
          best_score: number
          correct_count: number
          id: number
          score: number
          student_id: string
          submitted_at: string
          total_questions: number
        }
        Insert: {
          answers?: Json
          assessment_id: number
          attempt_number: number
          best_score: number
          correct_count: number
          id?: number
          score: number
          student_id: string
          submitted_at?: string
          total_questions: number
        }
        Update: {
          answers?: Json
          assessment_id?: number
          attempt_number?: number
          best_score?: number
          correct_count?: number
          id?: number
          score?: number
          student_id?: string
          submitted_at?: string
          total_questions?: number
        }
        Relationships: [
          {
            foreignKeyName: "module_assessment_attempts_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "module_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      module_assessment_questions: {
        Row: {
          assessment_id: number
          correct_option: string
          created_at: string
          id: number
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          order_index: number
          question_text: string
        }
        Insert: {
          assessment_id: number
          correct_option: string
          created_at?: string
          id?: number
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          order_index?: number
          question_text: string
        }
        Update: {
          assessment_id?: number
          correct_option?: string
          created_at?: string
          id?: number
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          order_index?: number
          question_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_assessment_questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "module_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      module_assessments: {
        Row: {
          created_at: string
          id: number
          module_id: number
          title: string
        }
        Insert: {
          created_at?: string
          id?: number
          module_id: number
          title: string
        }
        Update: {
          created_at?: string
          id?: number
          module_id?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_assessments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: true
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          created_at: string | null
          description: string | null
          gamification_type: string
          id: number
          is_active: boolean | null
          level: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          gamification_type?: string
          id?: number
          is_active?: boolean | null
          level?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          gamification_type?: string
          id?: number
          is_active?: boolean | null
          level?: string | null
          title?: string
        }
        Relationships: []
      }
      monthly_evaluations: {
        Row: {
          created_at: string
          id: string
          next_goals: string
          period: string
          published_at: string | null
          rating: string | null
          status: string
          strengths: string
          student_id: string
          summary: string
          tutor_id: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          next_goals?: string
          period: string
          published_at?: string | null
          rating?: string | null
          status?: string
          strengths?: string
          student_id: string
          summary?: string
          tutor_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          next_goals?: string
          period?: string
          published_at?: string | null
          rating?: string | null
          status?: string
          strengths?: string
          student_id?: string
          summary?: string
          tutor_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_evaluations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_evaluations_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_links: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          invoice_id: string | null
          student_id: string
          token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          invoice_id?: string | null
          student_id: string
          token?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          invoice_id?: string | null
          student_id?: string
          token?: string
        }
        Relationships: []
      }
      pet_cosmetics: {
        Row: {
          asset_url: string
          category: string
          id: string
          is_active: boolean | null
          name: string
          price_coins: number
        }
        Insert: {
          asset_url: string
          category: string
          id?: string
          is_active?: boolean | null
          name: string
          price_coins?: number
        }
        Update: {
          asset_url?: string
          category?: string
          id?: string
          is_active?: boolean | null
          name?: string
          price_coins?: number
        }
        Relationships: []
      }
      post_class_quiz_attempts: {
        Row: {
          attempts_count: number
          best_score: number
          created_at: string
          id: string
          last_submitted_at: string
          score: number
          student_id: string
          topic_id: number
        }
        Insert: {
          attempts_count?: number
          best_score?: number
          created_at?: string
          id?: string
          last_submitted_at?: string
          score?: number
          student_id: string
          topic_id: number
        }
        Update: {
          attempts_count?: number
          best_score?: number
          created_at?: string
          id?: string
          last_submitted_at?: string
          score?: number
          student_id?: string
          topic_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_class_quiz_attempts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          language_preference: string
          role: string
          timezone: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          language_preference?: string
          role: string
          timezone?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          language_preference?: string
          role?: string
          timezone?: string | null
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          attempts_count: number
          created_at: string
          engine_sourced: boolean | null
          id: number
          quiz_id: number
          score: number
          student_id: string
          total_questions: number
        }
        Insert: {
          attempts_count?: number
          created_at?: string
          engine_sourced?: boolean | null
          id?: number
          quiz_id: number
          score?: number
          student_id: string
          total_questions?: number
        }
        Update: {
          attempts_count?: number
          created_at?: string
          engine_sourced?: boolean | null
          id?: number
          quiz_id?: number
          score?: number
          student_id?: string
          total_questions?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_option: string
          created_at: string | null
          id: number
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_text: string
          quiz_id: number
          source: string
        }
        Insert: {
          correct_option: string
          created_at?: string | null
          id?: number
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_text: string
          quiz_id: number
          source?: string
        }
        Update: {
          correct_option?: string
          created_at?: string | null
          id?: number
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          question_text?: string
          quiz_id?: number
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string | null
          id: number
          source: string
          title: string | null
          topic_id: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          source?: string
          title?: string | null
          topic_id: number
        }
        Update: {
          created_at?: string | null
          id?: number
          source?: string
          title?: string | null
          topic_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: true
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      session_reports: {
        Row: {
          achievements: string
          activities: string
          competencies: Json
          created_at: string
          difficulties: string
          id: string
          meeting_id: number | null
          module_name: string | null
          parent_recommendations: string
          session_date: string
          session_number: number | null
          solutions: string
          status: string
          student_id: string
          submitted_at: string | null
          topic: string
          tutor_id: string
          updated_at: string
          version: number
        }
        Insert: {
          achievements?: string
          activities?: string
          competencies?: Json
          created_at?: string
          difficulties?: string
          id?: string
          meeting_id?: number | null
          module_name?: string | null
          parent_recommendations?: string
          session_date: string
          session_number?: number | null
          solutions?: string
          status?: string
          student_id: string
          submitted_at?: string | null
          topic?: string
          tutor_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          achievements?: string
          activities?: string
          competencies?: Json
          created_at?: string
          difficulties?: string
          id?: string
          meeting_id?: number | null
          module_name?: string | null
          parent_recommendations?: string
          session_date?: string
          session_number?: number | null
          solutions?: string
          status?: string
          student_id?: string
          submitted_at?: string | null
          topic?: string
          tutor_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_reports_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_reports_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_assessment_unlocks: {
        Row: {
          created_at: string
          module_id: number
          reason: string
          student_id: string
          unlocked_by: string | null
        }
        Insert: {
          created_at?: string
          module_id: number
          reason?: string
          student_id: string
          unlocked_by?: string | null
        }
        Update: {
          created_at?: string
          module_id?: number
          reason?: string
          student_id?: string
          unlocked_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_assessment_unlocks_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_assessment_unlocks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_assessment_unlocks_unlocked_by_fkey"
            columns: ["unlocked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: number
          student_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: number
          student_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: number
          student_id?: string
        }
        Relationships: []
      }
      student_inventory: {
        Row: {
          id: number
          is_equipped: boolean
          item_id: string
          obtained_at: string | null
          quantity: number
          student_id: string
        }
        Insert: {
          id?: never
          is_equipped?: boolean
          item_id: string
          obtained_at?: string | null
          quantity?: number
          student_id: string
        }
        Update: {
          id?: never
          is_equipped?: boolean
          item_id?: string
          obtained_at?: string | null
          quantity?: number
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "game_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_inventory_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_lesson_progress: {
        Row: {
          checkpoints: Json
          id: number
          max_slide_index: number
          slide_index: number
          state: string
          student_id: string
          submission_draft: Json | null
          topic_id: number
          updated_at: string
          version: number
        }
        Insert: {
          checkpoints?: Json
          id?: number
          max_slide_index?: number
          slide_index?: number
          state?: string
          student_id: string
          submission_draft?: Json | null
          topic_id: number
          updated_at?: string
          version?: number
        }
        Update: {
          checkpoints?: Json
          id?: number
          max_slide_index?: number
          slide_index?: number
          state?: string
          student_id?: string
          submission_draft?: Json | null
          topic_id?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_lesson_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_lesson_progress_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      student_modules: {
        Row: {
          created_at: string
          id: number
          module_id: number
          status: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          module_id: number
          status?: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: number
          module_id?: number
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_modules_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_pet_inventory: {
        Row: {
          cosmetic_id: string | null
          id: string
          is_equipped: boolean | null
          purchased_at: string | null
          student_id: string | null
        }
        Insert: {
          cosmetic_id?: string | null
          id?: string
          is_equipped?: boolean | null
          purchased_at?: string | null
          student_id?: string | null
        }
        Update: {
          cosmetic_id?: string | null
          id?: string
          is_equipped?: boolean | null
          purchased_at?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_pet_inventory_cosmetic_id_fkey"
            columns: ["cosmetic_id"]
            isOneToOne: false
            referencedRelation: "pet_cosmetics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_pet_inventory_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_pets: {
        Row: {
          created_at: string | null
          creative_data: number
          hunger_level: number
          id: string
          is_glitched: boolean
          last_fed_at: string | null
          logic_data: number
          nickname: string
          spatial_data: number
          species: string
          stage: string
          student_id: string
        }
        Insert: {
          created_at?: string | null
          creative_data?: number
          hunger_level?: number
          id?: string
          is_glitched?: boolean
          last_fed_at?: string | null
          logic_data?: number
          nickname?: string
          spatial_data?: number
          species?: string
          stage?: string
          student_id: string
        }
        Update: {
          created_at?: string | null
          creative_data?: number
          hunger_level?: number
          id?: string
          is_glitched?: boolean
          last_fed_at?: string | null
          logic_data?: number
          nickname?: string
          spatial_data?: number
          species?: string
          stage?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_pets_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_tariffs: {
        Row: {
          amount_per_session: number
          currency: string
          student_id: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          amount_per_session: number
          currency?: string
          student_id: string
          updated_at?: string
          updated_by: string
        }
        Update: {
          amount_per_session?: number
          currency?: string
          student_id?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_tariffs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_tariffs_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_topic_stage_progress: {
        Row: {
          completed_at: string
          stage_key: string
          status: string
          student_id: string
          topic_id: number
        }
        Insert: {
          completed_at?: string
          stage_key: string
          status: string
          student_id: string
          topic_id: number
        }
        Update: {
          completed_at?: string
          stage_key?: string
          status?: string
          student_id?: string
          topic_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_topic_stage_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_topic_stage_progress_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          avatar_id: string
          bio: string | null
          coins: number
          created_at: string | null
          edu_coins: number
          email_or_phone: string | null
          equipped_cosmetics: Json
          equipped_hat: string | null
          equipped_hat_id: string | null
          equipped_outfit: string | null
          full_name: string | null
          grade: string | null
          id: string
          inventory: Json
          job_class: string
          mpin: string | null
          title_id: string
          total_xp: number
          whatsapp: string | null
        }
        Insert: {
          avatar_id?: string
          bio?: string | null
          coins?: number
          created_at?: string | null
          edu_coins?: number
          email_or_phone?: string | null
          equipped_cosmetics?: Json
          equipped_hat?: string | null
          equipped_hat_id?: string | null
          equipped_outfit?: string | null
          full_name?: string | null
          grade?: string | null
          id: string
          inventory?: Json
          job_class?: string
          mpin?: string | null
          title_id?: string
          total_xp?: number
          whatsapp?: string | null
        }
        Update: {
          avatar_id?: string
          bio?: string | null
          coins?: number
          created_at?: string | null
          edu_coins?: number
          email_or_phone?: string | null
          equipped_cosmetics?: Json
          equipped_hat?: string | null
          equipped_hat_id?: string | null
          equipped_outfit?: string | null
          full_name?: string | null
          grade?: string | null
          id?: string
          inventory?: Json
          job_class?: string
          mpin?: string | null
          title_id?: string
          total_xp?: number
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_progress: {
        Row: {
          attended_meeting: boolean | null
          best_quiz_score: number
          completed_at: string | null
          engine_topic_id: string | null
          id: number
          quiz_completed: boolean | null
          student_id: string
          topic_id: number
          xp_earned: number
        }
        Insert: {
          attended_meeting?: boolean | null
          best_quiz_score?: number
          completed_at?: string | null
          engine_topic_id?: string | null
          id?: number
          quiz_completed?: boolean | null
          student_id: string
          topic_id: number
          xp_earned?: number
        }
        Update: {
          attended_meeting?: boolean | null
          best_quiz_score?: number
          completed_at?: string | null
          engine_topic_id?: string | null
          id?: number
          quiz_completed?: boolean | null
          student_id?: string
          topic_id?: number
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "topic_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_progress_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_quiz_attempt_snapshots: {
        Row: {
          attempt_id: number
          created_at: string
          quiz_snapshot: Json
        }
        Insert: {
          attempt_id: number
          created_at?: string
          quiz_snapshot: Json
        }
        Update: {
          attempt_id?: number
          created_at?: string
          quiz_snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "topic_quiz_attempt_snapshots_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: true
            referencedRelation: "topic_quiz_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_quiz_attempts: {
        Row: {
          answers: Json
          attempt_num: number
          id: number
          quiz_version: number | null
          score: number
          student_id: string
          submitted_at: string
          topic_id: number
        }
        Insert: {
          answers?: Json
          attempt_num: number
          id?: number
          quiz_version?: number | null
          score: number
          student_id: string
          submitted_at?: string
          topic_id: number
        }
        Update: {
          answers?: Json
          attempt_num?: number
          id?: number
          quiz_version?: number | null
          score?: number
          student_id?: string
          submitted_at?: string
          topic_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "topic_quiz_attempts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string | null
          description: string | null
          engine_topic_id: string | null
          id: number
          lesson_content: Json | null
          module_id: number
          order_index: number
          project_link: string | null
          published_at: string | null
          status: string
          title: string
          topic_link: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          engine_topic_id?: string | null
          id?: number
          lesson_content?: Json | null
          module_id: number
          order_index: number
          project_link?: string | null
          published_at?: string | null
          status?: string
          title: string
          topic_link?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          engine_topic_id?: string | null
          id?: number
          lesson_content?: Json | null
          module_id?: number
          order_index?: number
          project_link?: string | null
          published_at?: string | null
          status?: string
          title?: string
          topic_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "topics_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_student_assignments: {
        Row: {
          created_at: string
          created_by: string | null
          ended_at: string | null
          id: string
          status: string
          student_id: string
          tutor_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          id?: string
          status?: string
          student_id: string
          tutor_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          id?: string
          status?: string
          student_id?: string
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_student_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_student_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_student_assignments_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acquire_admin_deactivation_lock: {
        Args: { p_lock_token: string }
        Returns: boolean
      }
      activate_learning_path: {
        Args: { p_module_id: number; p_student_id: string }
        Returns: undefined
      }
      admin_set_student_mpin: {
        Args: { p_mpin?: string; p_phone: string; p_student_id: string }
        Returns: undefined
      }
      complete_student_topic_stage: {
        Args: { p_stage_key: string; p_status?: string; p_topic_id: number }
        Returns: {
          completed_at: string
          stage_key: string
          status: string
          student_id: string
          topic_id: number
        }
        SetofOptions: {
          from: "*"
          to: "student_topic_stage_progress"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_draft_invoice: {
        Args: { p_period: string; p_student_id: string }
        Returns: {
          additional_charges: number
          adjustment_note: string
          attended_meetings: number
          bank_account: string | null
          created_at: string | null
          created_by: string | null
          currency: string
          discount_amount: number
          id: string
          issued_at: string | null
          issued_by: string | null
          month_year: string
          paid_at: string | null
          price_per_meeting: number
          status: string | null
          student_id: string | null
          total_amount: number
          total_meetings: number
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_recurring_meeting_series:
        | {
            Args: {
              p_duration_minutes: number
              p_meeting_url?: string
              p_module_id: number
              p_start_date: string
              p_start_time: string
              p_student_id: string
              p_tutor_id: string
              p_weekdays: number[]
            }
            Returns: {
              cancellation_reason: string | null
              cancelled_at: string | null
              cancelled_by: string | null
              completion_status: string | null
              created_at: string
              deleted_at: string | null
              deleted_by: string | null
              duration_minutes: number
              id: number
              is_completed: boolean | null
              link_url: string | null
              meeting_date: string
              module_id: number | null
              notes: string | null
              progress_report: string | null
              replacement_for_session_id: number | null
              replacement_required: boolean
              replacement_session_id: number | null
              series_id: string | null
              session_count: number | null
              session_number: number | null
              teacher_id: string | null
              title: string
              topic_id: number | null
              updated_at: string
              version: number
            }[]
            SetofOptions: {
              from: "*"
              to: "meetings"
              isOneToOne: false
              isSetofReturn: true
            }
          }
        | {
            Args: {
              p_duration_minutes: number
              p_meeting_url?: string
              p_start_date: string
              p_start_time: string
              p_student_id: string
              p_target_count: number
              p_tutor_id: string
              p_weekdays: number[]
            }
            Returns: {
              cancellation_reason: string | null
              cancelled_at: string | null
              cancelled_by: string | null
              completion_status: string | null
              created_at: string
              deleted_at: string | null
              deleted_by: string | null
              duration_minutes: number
              id: number
              is_completed: boolean | null
              link_url: string | null
              meeting_date: string
              module_id: number | null
              notes: string | null
              progress_report: string | null
              replacement_for_session_id: number | null
              replacement_required: boolean
              replacement_session_id: number | null
              series_id: string | null
              session_count: number | null
              session_number: number | null
              teacher_id: string | null
              title: string
              topic_id: number | null
              updated_at: string
              version: number
            }[]
            SetofOptions: {
              from: "*"
              to: "meetings"
              isOneToOne: false
              isSetofReturn: true
            }
          }
      create_replacement_meeting: {
        Args: {
          p_duration_minutes?: number
          p_meeting_url?: string
          p_original_meeting_id: number
          p_scheduled_start_at: string
        }
        Returns: Json
      }
      delete_expired_learning_logs: { Args: never; Returns: undefined }
      get_my_parent_hub_module: { Args: { p_module_id: number }; Returns: Json }
      get_my_topic_stage_progress: {
        Args: { p_topic_id: number }
        Returns: {
          completed_at: string
          stage_key: string
          status: string
        }[]
      }
      get_student_challenge_submission: {
        Args: { p_topic_id: number }
        Returns: {
          challenge_id: number
          created_at: string
          id: number
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          student_id: string
          submission_note: string | null
          submission_url: string | null
          submitted_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "challenge_submissions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      issue_draft_invoice: {
        Args: { p_invoice_id: string }
        Returns: {
          additional_charges: number
          adjustment_note: string
          attended_meetings: number
          bank_account: string | null
          created_at: string | null
          created_by: string | null
          currency: string
          discount_amount: number
          id: string
          issued_at: string | null
          issued_by: string | null
          month_year: string
          paid_at: string | null
          price_per_meeting: number
          status: string | null
          student_id: string | null
          total_amount: number
          total_meetings: number
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      list_my_released_topic_ids: {
        Args: { p_module_id: number }
        Returns: {
          topic_id: number
        }[]
      }
      list_my_tutor_pending_submissions: {
        Args: never
        Returns: {
          challenge_title: string
          student_grade: string
          student_id: string
          student_name: string
          submission_id: number
          submission_note: string
          submission_url: string
          submitted_at: string
          topic_id: number
          topic_title: string
        }[]
      }
      list_tutor_assigned_students: {
        Args: never
        Returns: {
          avatar_id: string
          full_name: string
          grade: string
          student_id: string
        }[]
      }
      mark_invoice_paid: {
        Args: {
          p_invoice_id: string
          p_notes: string
          p_payment_method: string
          p_reference: string
        }
        Returns: {
          additional_charges: number
          adjustment_note: string
          attended_meetings: number
          bank_account: string | null
          created_at: string | null
          created_by: string | null
          currency: string
          discount_amount: number
          id: string
          issued_at: string | null
          issued_by: string | null
          month_year: string
          paid_at: string | null
          price_per_meeting: number
          status: string | null
          student_id: string | null
          total_amount: number
          total_meetings: number
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_student_module_assessment_attempt: {
        Args: {
          p_answers: Json
          p_assessment_id: number
          p_correct_count: number
          p_score: number
          p_student_id: string
          p_total_questions: number
        }
        Returns: {
          attempt_number: number
          best_score: number
          correct_count: number
          score: number
          submitted_at: string
          total_questions: number
        }[]
      }
      release_admin_deactivation_lock: {
        Args: { p_lock_token: string }
        Returns: boolean
      }
      save_meeting_report: {
        Args: {
          p_actor_id: string
          p_attendance: Json
          p_completion_status: string
          p_mark_completed: boolean
          p_meeting_id: number
          p_progress_report: string
        }
        Returns: undefined
      }
      save_student_lesson_progress: {
        Args: {
          p_checkpoints?: Json
          p_expected_version?: number
          p_slide_index?: number
          p_state: string
          p_submission_draft?: Json
          p_topic_id: number
        }
        Returns: {
          checkpoints: Json
          id: number
          max_slide_index: number
          slide_index: number
          state: string
          student_id: string
          submission_draft: Json | null
          topic_id: number
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "student_lesson_progress"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_topic_quiz_attempt_with_snapshot: {
        Args: {
          p_answers: Json
          p_attempt_num: number
          p_quiz_snapshot: Json
          p_quiz_version: number
          p_score: number
          p_student_id: string
          p_topic_id: number
        }
        Returns: number
      }
      student_module_topic_completion: {
        Args: { p_module_id: number; p_student_id: string }
        Returns: {
          completed_topics: number
          total_topics: number
        }[]
      }
      student_topic_is_released: {
        Args: { p_student_id: string; p_topic_id: number }
        Returns: boolean
      }
      submit_student_challenge: {
        Args: {
          p_submission_note?: string
          p_submission_url: string
          p_topic_id: number
        }
        Returns: {
          challenge_id: number
          created_at: string
          id: number
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          student_id: string
          submission_note: string | null
          submission_url: string | null
          submitted_at: string
        }
        SetofOptions: {
          from: "*"
          to: "challenge_submissions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_draft_invoice: {
        Args: {
          p_additional_charges: number
          p_adjustment_note: string
          p_discount_amount: number
          p_invoice_id: string
          p_manual_total: number
          p_meeting_ids: number[]
        }
        Returns: {
          additional_charges: number
          adjustment_note: string
          attended_meetings: number
          bank_account: string | null
          created_at: string | null
          created_by: string | null
          currency: string
          discount_amount: number
          id: string
          issued_at: string | null
          issued_by: string | null
          month_year: string
          paid_at: string | null
          price_per_meeting: number
          status: string | null
          student_id: string | null
          total_amount: number
          total_meetings: number
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      verify_student_mpin: {
        Args: { p_mpin: string; p_phone: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
