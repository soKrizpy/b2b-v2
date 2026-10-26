import { requireAdmin } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { apiUnauthorized, apiForbidden, apiInternalError } from '@/lib/errors';

export async function GET(): Promise<Response> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.status === 401 ? apiUnauthorized() : apiForbidden();

  try {
    const db = createSupabaseAdminClient();
    const { data, error } = await db
      .from('modules')
      .select('id, title, level')
      .eq('is_active', true)
      .order('title', { ascending: true });

    if (error) return apiInternalError('Gagal memuat modul kurikulum.');
    const modules = (data ?? []) as unknown as Array<{
      id: number;
      title: string | null;
      level: string | null;
    }>;
    if (modules.length === 0) {
      return Response.json([], { headers: { 'Cache-Control': 'no-store' } });
    }
    const { data: topics, error: topicsError } = await (db
      .from('topics')
      .select('id, module_id, title, order_index')
      .in('module_id', modules.map((module) => module.id))
      .eq('status', 'published') as unknown as Promise<{
        data: Array<{ id: number; module_id: number; title: string; order_index: number }> | null;
        error: { message: string } | null;
      }>);
    if (topicsError) return apiInternalError('Gagal memuat modul kurikulum.');

    const topicCounts = new Map<number, number>();
    for (const topic of topics ?? []) {
      topicCounts.set(topic.module_id, (topicCounts.get(topic.module_id) ?? 0) + 1);
    }

    return Response.json(modules.map((module) => ({
      ...module,
      publishedTopicCount: topicCounts.get(module.id) ?? 0,
      publishedTopics: (topics ?? [])
        .filter((topic) => topic.module_id === module.id)
        .sort((a, b) => a.order_index - b.order_index || a.id - b.id)
        .map((topic) => ({ id: topic.id, title: topic.title })),
    })), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return apiInternalError('Gagal memuat modul kurikulum.');
  }
}
