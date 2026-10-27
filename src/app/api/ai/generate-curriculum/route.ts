import { NextRequest, NextResponse } from 'next/server';
import { generateCurriculum } from '@/features/ai/actions';
import { requireAdmin } from '@/lib/auth';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.message }, { status: 403 });
    }

    const incoming = await req.json().catch(() => ({}));
    const body = incoming && typeof incoming === 'object'
      ? incoming as Record<string, unknown>
      : {};
    const topicTitle = typeof body.topic_title === 'string' ? body.topic_title.trim() : '';
    const levelValue = typeof body.level === 'string' ? body.level.trim() : 'beginner';
    const allowedLevels = new Set(['beginner', 'intermediate', 'advanced']);
    const level = allowedLevels.has(levelValue) ? levelValue : 'beginner';
    const moduleTitle = typeof body.module_title === 'string' ? body.module_title.trim() : 'Modul';

    if (!topicTitle) {
      return NextResponse.json(
        { success: false, error: 'Judul topik wajib diisi.' },
        { status: 400 }
      );
    }
    if (topicTitle.length > 180 || moduleTitle.length > 180) {
      return NextResponse.json(
        { success: false, error: 'Judul topik atau modul terlalu panjang.' },
        { status: 400 }
      );
    }

    const formData = new FormData();
    formData.append('topic_title', topicTitle);
    formData.append('level', level);
    formData.append('module_title', moduleTitle);

    const result = await generateCurriculum(null, formData);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (err: unknown) {
    console.error('[API /api/ai/generate-curriculum] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Gagal menghasilkan kurikulum dengan AI. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}
