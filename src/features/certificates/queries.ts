// src/features/certificates/queries.ts
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { CertificateRow, CertificateTier } from '@/types/database';
import { CERTIFICATE_TIER_CONFIG } from './tiers';

export interface CertificateWithModule extends CertificateRow {
  module_title: string | null;
}

export const TIER_CONFIG: Record<CertificateTier, typeof CERTIFICATE_TIER_CONFIG[CertificateTier]> = CERTIFICATE_TIER_CONFIG;

export async function getStudentCertificates(studentId: string): Promise<CertificateWithModule[]> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('certificates')
    .select('id, student_id, module_id, score, tier, certificate_number, issued_at, modules(title)')
    .eq('student_id', studentId)
    .order('issued_at', { ascending: false });

  if (error) { console.error('[getStudentCertificates]', error.message); return []; }

  return (data ?? []).map((row: unknown) => {
    const r = row as CertificateRow & { modules: { title: string } | null };
    return { ...r, module_title: r.modules?.title ?? null };
  });
}

export async function getCertificateByModuleAndStudent(
  studentId: string, moduleId: number
): Promise<CertificateRow | null> {
  const db = createSupabaseAdminClient();
  const { data } = await (db
    .from('certificates')
    .select('id, student_id, module_id, score, tier, certificate_number, issued_at')
    .eq('student_id', studentId)
    .eq('module_id', moduleId)
    .maybeSingle() as unknown as Promise<{ data: CertificateRow | null; error: unknown }>);
  return data;
}
