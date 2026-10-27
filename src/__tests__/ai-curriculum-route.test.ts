import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { generateCurriculum } from '@/features/ai/actions';
import { requireAdmin } from '@/lib/auth';
import { POST } from '@/app/api/ai/generate-curriculum/route';

vi.mock('@/features/ai/actions', () => ({
  generateCurriculum: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  requireAdmin: vi.fn(),
}));

function makeRequest(body: unknown): NextRequest {
  return new Request('http://localhost/api/ai/generate-curriculum', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest;
}

describe('POST /api/ai/generate-curriculum', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({ ok: true, role: 'admin' } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects non-admin requests before generating content', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ ok: false, message: 'Akses ditolak.' } as never);
    const response = await POST(makeRequest({ topic_title: 'Scratch' }));
    expect(response.status).toBe(403);
    expect(generateCurriculum).not.toHaveBeenCalled();
  });

  it('requires a non-empty topic title', async () => {
    const response = await POST(makeRequest({ topic_title: '   ' }));
    expect(response.status).toBe(400);
    expect(generateCurriculum).not.toHaveBeenCalled();
  });

  it('passes normalized form data to the shared generator and returns its payload', async () => {
    const result = { success: true, data: '{"module_title":"Scratch","topics":[]}' };
    vi.mocked(generateCurriculum).mockResolvedValue(result as never);

    const response = await POST(makeRequest({
      topic_title: '  Pengenalan Scratch  ',
      level: 'advanced',
      module_title: '  Scratch Beginner  ',
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(result);
    expect(generateCurriculum).toHaveBeenCalledTimes(1);
    const [, formData] = vi.mocked(generateCurriculum).mock.calls[0] as [unknown, FormData];
    expect(formData.get('topic_title')).toBe('Pengenalan Scratch');
    expect(formData.get('level')).toBe('advanced');
    expect(formData.get('module_title')).toBe('Scratch Beginner');
  });

  it('falls back to beginner for an unknown level', async () => {
    vi.mocked(generateCurriculum).mockResolvedValue({ success: true, data: '{}' } as never);
    await POST(makeRequest({ topic_title: 'Scratch', level: 'expert' }));
    const [, formData] = vi.mocked(generateCurriculum).mock.calls[0] as [unknown, FormData];
    expect(formData.get('level')).toBe('beginner');
  });

  it('returns a server error when the shared generator rejects the prompt', async () => {
    const result = { success: false, error: 'Kurikulum tidak memenuhi aturan.' };
    vi.mocked(generateCurriculum).mockResolvedValue(result as never);
    const response = await POST(makeRequest({ topic_title: 'Scratch' }));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual(result);
  });
});
