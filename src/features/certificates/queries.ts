// src/features/certificates/queries.ts
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { CertificateRow, CertificateTier } from '@/types/database';
import { CERTIFICATE_TIER_CONFIG } from './tiers';
import { hasRenderableCurriculumContent } from '@/features/curriculum/lessonSlides';

export interface CertificateWithModule extends CertificateRow {
  module_title: string | null;
}

export interface VerifiedLearningTopic {
  id: number;
  title: string;
  completed_at: string | null;
}

export interface VerifiedBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface PublicCertificateVerification {
  certificate: Pick<CertificateRow, 'score' | 'tier' | 'certificate_number' | 'issued_at' | 'verification_token' | 'learning_record'>;
  studentName: string;
  moduleTitle: string;
  topics: VerifiedLearningTopic[];
  badges: VerifiedBadge[];
  certificateCount: number;
}

export const TIER_CONFIG: Record<CertificateTier, typeof CERTIFICATE_TIER_CONFIG[CertificateTier]> = CERTIFICATE_TIER_CONFIG;

export async function getStudentCertificates(studentId: string): Promise<CertificateWithModule[]> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('certificates')
    .select('id, student_id, module_id, score, tier, certificate_number, issued_at, verification_token, learning_record, issue_source, issued_by, admin_note, modules(title)')
    .eq('student_id', studentId)
    .order('issued_at', { ascending: false });

  if (error) { console.error('[getStudentCertificates]', error.message); return []; }

  return (data ?? []).map((row: unknown) => {
    const r = row as CertificateRow & { modules: { title: string } | null };
    return { ...r, module_title: r.modules?.title ?? null };
  });
}

/** Public verification lookup. Only a random UUID token is exposed to the browser. */
export async function getPublicCertificateVerification(
  token: string,
): Promise<PublicCertificateVerification | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
    return null;
  }

  const db = createSupabaseAdminClient();
  const { data: cert, error: certError } = await (db
    .from('certificates')
    .select('id, student_id, module_id, score, tier, certificate_number, issued_at, verification_token, learning_record')
    .eq('verification_token', token)
    .maybeSingle() as unknown as Promise<{
      data: Pick<CertificateRow, 'id' | 'student_id' | 'module_id' | 'score' | 'tier' | 'certificate_number' | 'issued_at' | 'verification_token' | 'learning_record'> | null;
      error: { message: string } | null;
    }>);

  if (certError || !cert) return null;

  const [
    { data: student, error: studentError },
    { data: moduleRow, error: moduleError },
    { data: progressRows },
    { data: certRows },
  ] = await Promise.all([
    db.from('students')
      .select('full_name, total_xp, coins, inventory, equipped_hat_id, equipped_cosmetics')
      .eq('id', cert.student_id)
      .maybeSingle() as unknown as Promise<{
        data: {
          full_name: string;
          total_xp: number | null;
          coins: number | null;
          inventory: unknown;
          equipped_hat_id: string | null;
          equipped_cosmetics: unknown;
        } | null;
        error: { message: string } | null;
      }>,
    db.from('modules')
      .select('title')
      .eq('id', cert.module_id)
      .maybeSingle() as unknown as Promise<{
        data: { title: string | null } | null;
        error: { message: string } | null;
      }>,
    db.from('topic_progress')
      .select('completed_at, topics!inner(id, title, module_id, order_index, lesson_content, status)')
      .eq('student_id', cert.student_id)
      .eq('topics.module_id', cert.module_id)
      .order('completed_at', { ascending: true }) as unknown as Promise<{
        data: Array<{
          completed_at: string;
          topics: { id: number; title: string; module_id: number; order_index: number; lesson_content: unknown; status: string | null } | null;
        }> | null;
        error: unknown;
      }>,
    db.from('certificates')
      .select('id')
      .eq('student_id', cert.student_id) as unknown as Promise<{
        data: Array<{ id: number }> | null;
        error: unknown;
      }>,
  ]);

  if (studentError || moduleError || !student || !moduleRow) return null;

  const trackedTopics = (progressRows ?? [])
    .filter((row) => row.topics && row.topics.module_id === cert.module_id && row.topics.status === 'published' && hasRenderableCurriculumContent(row.topics.lesson_content))
    .map((row) => ({
      id: row.topics!.id,
      title: row.topics!.title,
      completed_at: row.completed_at,
      order_index: row.topics!.order_index,
    }))
    .sort((a, b) => a.order_index - b.order_index)
    .map(({ id, title, completed_at }) => ({ id, title, completed_at }));

  // Manual certificates use the admin-confirmed snapshot, including legacy topics
  // whose completion was not recorded by the learning engine.
  const savedLearningRecord = Array.isArray(cert.learning_record)
    ? cert.learning_record as Array<{ topic_id: number; title: string; order_index: number }>
    : [];
  const topics = savedLearningRecord.length > 0
    ? savedLearningRecord
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .map((topic) => ({ id: topic.topic_id, title: topic.title, completed_at: null }))
    : trackedTopics;

  const inventoryCount = Array.isArray(student.inventory) ? student.inventory.length : 0;
  const cosmetics = student.equipped_cosmetics && typeof student.equipped_cosmetics === 'object'
    ? student.equipped_cosmetics as { hatId?: string | null }
    : {};
  const hasEquippedHat = Boolean(cosmetics.hatId ?? student.equipped_hat_id);
  const totalXp = student.total_xp ?? 0;
  const coins = student.coins ?? 0;
  const certificateCount = certRows?.length ?? 0;

  // Keep this list in sync with StudentAchievementBadges.tsx.
  const badgeRules: Array<VerifiedBadge & { unlocked: boolean }> = [
    { id: 'novice-coder', title: 'Pemula Kode', description: 'Memulai perjalanan belajar di Bits2Bytes', icon: '🌱', rarity: 'common', unlocked: totalXp >= 0 },
    { id: 'explorer', title: 'Penjelajah Kode', description: 'Mencapai Level 2 dengan menembus 100 EXP', icon: '🧭', rarity: 'common', unlocked: totalXp >= 100 },
    { id: 'logic-adventurer', title: 'Petualang Logika', description: 'Mencapai Level 3 dengan mengumpulkan 250 EXP', icon: '⚡', rarity: 'rare', unlocked: totalXp >= 250 },
    { id: 'algorithm-master', title: 'Master Algoritma', description: 'Mencapai Level 5 dengan total 600 EXP', icon: '🔮', rarity: 'epic', unlocked: totalXp >= 600 },
    { id: 'cyber-legend', title: 'Cyber Legend', description: 'Puncak dedikasi koding menembus 2.500 EXP', icon: '👑', rarity: 'legendary', unlocked: totalXp >= 2500 },
    { id: 'first-gold', title: 'Tabungan Koin', description: 'Mengumpulkan 20 Koin B2B dari tugas dan tantangan', icon: '🪙', rarity: 'common', unlocked: coins >= 20 },
    { id: 'coin-collector', title: 'Kolektor Koin', description: 'Mengumpulkan 50 Koin di pundi-pundi tabungan', icon: '💰', rarity: 'rare', unlocked: coins >= 50 },
    { id: 'coin-tycoon', title: 'Sultan B2B', description: 'Menimbun 150+ Koin siap belanja aksesori impian', icon: '🏦', rarity: 'epic', unlocked: coins >= 150 },
    { id: 'pet-stylish', title: 'Dressed Up', description: 'Melengkapi aksesori kepala pada Cyber Pet kesayangan', icon: '🧢', rarity: 'common', unlocked: hasEquippedHat },
    { id: 'fashion-starter', title: 'Kolektor Kostum', description: 'Memiliki 2 atau lebih item kostum di lemari avatar', icon: '🛍️', rarity: 'rare', unlocked: inventoryCount >= 2 },
    { id: 'certified-scholar', title: 'Lulusan Teruji', description: 'Mendapatkan minimal 1 sertifikat kelulusan modul', icon: '📜', rarity: 'epic', unlocked: certificateCount >= 1 },
    { id: 'master-graduate', title: 'Cendekia Sejati', description: 'Menyelesaikan modul bergengsi dengan 2+ sertifikat', icon: '🏆', rarity: 'legendary', unlocked: certificateCount >= 2 },
  ];

  return {
    certificate: {
      score: cert.score,
      tier: cert.tier,
      certificate_number: cert.certificate_number,
      issued_at: cert.issued_at,
      verification_token: cert.verification_token,
      learning_record: cert.learning_record,
    },
    studentName: student.full_name,
    moduleTitle: moduleRow.title ?? 'Modul Bits2Bytes',
    topics,
    badges: badgeRules.filter((badge) => badge.unlocked).map((badge) => ({
      id: badge.id,
      title: badge.title,
      description: badge.description,
      icon: badge.icon,
      rarity: badge.rarity,
    })),
    certificateCount,
  };
}

export async function getCertificateByModuleAndStudent(
  studentId: string, moduleId: number
): Promise<CertificateRow | null> {
  const db = createSupabaseAdminClient();
  const { data } = await (db
    .from('certificates')
    .select('id, student_id, module_id, score, tier, certificate_number, issued_at, verification_token, learning_record, issue_source, issued_by, admin_note')
    .eq('student_id', studentId)
    .eq('module_id', moduleId)
    .maybeSingle() as unknown as Promise<{ data: CertificateRow | null; error: unknown }>);
  return data;
}
