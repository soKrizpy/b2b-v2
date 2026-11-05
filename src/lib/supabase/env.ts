// src/lib/supabase/env.ts
// Env-var helpers for Supabase configuration validation and diagnostics.

export function sanitizeEnvVal(raw: string | undefined): string {
  if (!raw) return '';
  return raw
    .trim()
    .replace(/\u200B/g, '')
    .replace(/\uFEFF/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '');
}

export function isValidSupabaseKey(key: string): boolean {
  if (!key || key.length < 20) return false;
  return key.startsWith('eyJ') || key.startsWith('sb_') || key.startsWith('sbp_');
}

export function getSupabaseUrl(): string {
  return sanitizeEnvVal(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function getSupabaseAnonKey(): string {
  const key = sanitizeEnvVal(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return isValidSupabaseKey(key) ? key : '';
}

export function getSupabaseServiceRoleKey(): string {
  const key = sanitizeEnvVal(process.env.SUPABASE_SERVICE_ROLE_KEY);
  return isValidSupabaseKey(key) ? key : '';
}

export function isSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  return url.startsWith('http') && isValidSupabaseKey(anonKey);
}

export function isValidServiceRoleJwt(key: string): boolean {
  if (!key) return false;
  try {
    const parts = key.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    );
    return payload?.role === 'service_role';
  } catch {
    return false;
  }
}
