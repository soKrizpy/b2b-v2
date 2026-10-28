import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/sessions/[id]/mapping/route';

const state = vi.hoisted(() => ({
  auth: { ok: true as boolean, status: 403 as 401 | 403 },
  rpcData: { meeting_id: 4, topic_id: 12, topic_title: 'Topic 1', student_count: 3 },
  rpcError: null as { code?: string; message: string } | null,
  calls: [] as unknown[][],
}));

vi.mock('@/lib/auth', () => ({
  requireAdmin: async () => state.auth.ok ? { ok: true, user: { id: 'admin' }, role: 'admin' } : { ok: false, status: state.auth.status, message: 'forbidden' },
}));

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    rpc: async (...args: unknown[]) => {
      state.calls.push(args);
      return { data: state.rpcData, error: state.rpcError };
    },
  }),
}));

function request(body: unknown) {
  return new Request('http://localhost/api/sessions/4/mapping', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('legacy meeting mapping API', () => {
  beforeEach(() => {
    vi.stubEnv('LEGACY_MEETING_MAPPING_ENABLED', 'true');
    state.auth = { ok: true, status: 403 };
    state.rpcError = null;
    state.calls = [];
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('keeps legacy mapping disabled by default until the hosted trigger is verified', async () => {
    vi.stubEnv('LEGACY_MEETING_MAPPING_ENABLED', '');
    const response = await POST(request({ module_id: 2, session_number: 1 }), { params: Promise.resolve({ id: '4' }) });
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ code: 'FEATURE_DISABLED' });
    expect(state.calls).toHaveLength(0);
  });

  it('requires an admin and does not invoke the mapping RPC for other roles', async () => {
    state.auth = { ok: false, status: 403 };
    const response = await POST(request({ module_id: 2, session_number: 1 }), { params: Promise.resolve({ id: '4' }) });
    expect(response.status).toBe(403);
    expect(state.calls).toHaveLength(0);
  });

  it('validates mapping inputs before calling the transactional RPC', async () => {
    const response = await POST(request({ module_id: 2, session_number: 0 }), { params: Promise.resolve({ id: '4' }) });
    expect(response.status).toBe(422);
    expect(state.calls).toHaveLength(0);
  });

  it('returns the mapping preview result after the server transaction succeeds', async () => {
    const response = await POST(request({ module_id: 2, session_number: 1 }), { params: Promise.resolve({ id: '4' }) });
    expect(response.status).toBe(200);
    expect(state.calls).toEqual([[
      'map_legacy_meeting_to_topic',
      { p_meeting_id: 4, p_module_id: 2, p_session_number: 1 },
    ]]);
    await expect(response.json()).resolves.toMatchObject({ success: true, mapping: { topic_id: 12, student_count: 3 } });
  });

  it('surfaces duplicate topic assignment as a conflict for admin review', async () => {
    state.rpcError = { code: '23505', message: 'Another meeting is already mapped to this topic' };
    const response = await POST(request({ module_id: 2, session_number: 1 }), { params: Promise.resolve({ id: '4' }) });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: 'DUPLICATE_STUDENT_TOPIC_ASSIGNMENT' });
  });
});
