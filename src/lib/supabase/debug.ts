// src/lib/supabase/debug.ts
// Runtime diagnostic utility to inspect and verify Supabase environment variables (masked).

import {
  getSupabaseUrl,
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  isValidSupabaseKey,
} from './env';

export interface MaskedEnvCheck {
  defined: boolean;
  maskedValue: string;
  rawLength: number;
  sanitizedLength: number;
  validFormat: boolean;
}

export interface SupabaseConfigDiagnostic {
  NEXT_PUBLIC_SUPABASE_URL: {
    defined: boolean;
    maskedValue: string;
    validHttpUrl: boolean;
  };
  NEXT_PUBLIC_SUPABASE_ANON_KEY: MaskedEnvCheck;
  SUPABASE_SERVICE_ROLE_KEY: MaskedEnvCheck;
}

function maskSecret(val: string): string {
  if (!val) return '<undefined>';
  if (val.length <= 12) return `${val.slice(0, 2)}***${val.slice(-2)} (len:${val.length})`;
  return `${val.slice(0, 8)}...${val.slice(-6)} (len:${val.length})`;
}

export function verifySupabaseConfig(): SupabaseConfigDiagnostic {
  const cleanUrl = getSupabaseUrl();
  const cleanAnon = getSupabaseAnonKey();
  const cleanService = getSupabaseServiceRoleKey();

  const diagnostic: SupabaseConfigDiagnostic = {
    NEXT_PUBLIC_SUPABASE_URL: {
      defined: Boolean(cleanUrl),
      maskedValue: cleanUrl || '<undefined>',
      validHttpUrl: cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://'),
    },
    NEXT_PUBLIC_SUPABASE_ANON_KEY: {
      defined: Boolean(cleanAnon),
      maskedValue: maskSecret(cleanAnon),
      rawLength: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? cleanAnon).length,
      sanitizedLength: cleanAnon.length,
      validFormat: isValidSupabaseKey(cleanAnon),
    },
    SUPABASE_SERVICE_ROLE_KEY: {
      defined: Boolean(cleanService),
      maskedValue: maskSecret(cleanService),
      rawLength: (process.env.SUPABASE_SERVICE_ROLE_KEY ?? cleanService).length,
      sanitizedLength: cleanService.length,
      validFormat: isValidSupabaseKey(cleanService),
    },
  };

  console.info('[verifySupabaseConfig]', JSON.stringify(diagnostic, null, 2));
  return diagnostic;
}
