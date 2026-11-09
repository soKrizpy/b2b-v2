import { beforeEach, describe, expect, it, vi } from 'vitest';

const { maybeSingle, eq, select, from, createSupabaseAdminClient } = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  const createSupabaseAdminClient = vi.fn(() => ({ from }));
  return { maybeSingle, eq, select, from, createSupabaseAdminClient };
});

vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient }));

import { resolveUserRole } from '@/features/auth/lib/resolveRole';

describe('resolveUserRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingle.mockResolvedValue({ data: { role: 'student' }, error: null });
  });

  it.each(['admin', 'teacher', 'student'] as const)('returns the profile role: %s', async (role) => {
    maybeSingle.mockResolvedValue({ data: { role }, error: null });
    await expect(resolveUserRole('user-123')).resolves.toBe(role);
    expect(from).toHaveBeenCalledWith('profiles');
    expect(select).toHaveBeenCalledWith('role');
    expect(eq).toHaveBeenCalledWith('id', 'user-123');
  });

  it('does not grant a role from missing profile or user metadata', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(resolveUserRole('user-123')).resolves.toBeNull();
  });

  it('rejects invalid profile roles', async () => {
    maybeSingle.mockResolvedValue({ data: { role: 'superadmin' }, error: null });
    await expect(resolveUserRole('user-123')).resolves.toBeNull();
  });

  it('fails closed when the profile lookup errors', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'permission denied' } });
    await expect(resolveUserRole('user-123')).resolves.toBeNull();
  });

  it('does not query a profile for an empty user id', async () => {
    await expect(resolveUserRole('')).resolves.toBeNull();
    expect(from).not.toHaveBeenCalled();
  });
});
