import { NextRequest, NextResponse } from 'next/server';
import { generateModuleFinalAssessment } from '@/features/ai/actions';
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
    const moduleId = typeof body.module_id === 'number'
      ? body.module_id
      : Number(body.module_id);

    if (!Number.isSafeInteger(moduleId) || moduleId <= 0) {
      return NextResponse.json(
        { success: false, error: 'ID modul tidak valid.' },
        { status: 400 }
      );
    }

    const result = await generateModuleFinalAssessment(moduleId);
    return NextResponse.json(result, { status: result.success ? 200 : 422 });
  } catch (error: unknown) {
    console.error('[API /api/ai/generate-final-assessment]', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghasilkan ujian akhir modul. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}
