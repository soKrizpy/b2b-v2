import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { generateModuleFinalAssessment } from '@/features/ai/actions';
import { requireAdmin } from '@/lib/auth';
import { POST } from '@/app/api/ai/generate-final-assessment/route';

vi.mock('@/features/ai/actions', () => ({
  generateModuleFinalAssessment: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  requireAdmin: vi.fn(),
}));

function makeRequest(body: unknown): NextRequest {
  return new Request('http://localhost/api/ai/generate-final-assessment', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest;
}

describe('POST /api/ai/generate-final-assessment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({ ok: true, role: 'admin' } as never);
  });

  it('rejects non-admin requests before generating an exam', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: false, message: 'Akses ditolak.' } as never);

    const response = await POST(makeRequest({ module_id: 7 }));

    expect(response.status).toBe(403);
    expect(generateModuleFinalAssessment).not.toHaveBeenCalled();
  });

  it('requires a positive safe module id', async () => {
    const response = await POST(makeRequest({ module_id: 0 }));

    expect(response.status).toBe(400);
    expect(generateModuleFinalAssessment).not.toHaveBeenCalled();
  });

  it('passes the module id to the generator and returns the saved result', async () => {
    const result = { success: true, data: { topicCount: 4, questionCount: 20 } };
    vi.mocked(generateModuleFinalAssessment).mockResolvedValue(result as never);

    const response = await POST(makeRequest({ module_id: 7 }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(result);
    expect(generateModuleFinalAssessment).toHaveBeenCalledWith(7);
  });

  it('returns validation/generation failures as 422', async () => {
    const result = { success: false, error: 'Belum ada topik published.' };
    vi.mocked(generateModuleFinalAssessment).mockResolvedValue(result as never);

    const response = await POST(makeRequest({ module_id: 7 }));

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual(result);
  });
});
