// src/features/ai/gemini.ts
// Shared Google Gemini client — server-only.
// Import this only from Server Actions or Route Handlers, never from 'use client' files.

import 'server-only';
import { GoogleGenAI } from '@google/genai';

let _aiInstance: GoogleGenAI | null = null;

export function hasGeminiApiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
}

export function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  if (!_aiInstance) {
    _aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return _aiInstance;
}

export const ai = new Proxy({} as GoogleGenAI, {
  get(_target, prop, receiver) {
    const client = getAiClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

export const PRIMARY_GEMINI_MODEL = 'gemini-flash-latest';
export const FALLBACK_GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'] as const;
export const FALLBACK_GEMINI_MODEL = 'gemini-3.1-flash-lite';
export const GEMINI_FLASH_MODEL = PRIMARY_GEMINI_MODEL;

export async function generateContentWithFallback(params: {
  contents: string | Record<string, unknown> | Array<unknown>;
  config?: Record<string, unknown>;
  preferredModel?: string;
}): Promise<string> {
  const client = getAiClient();
  const candidateModels = Array.from(
    new Set([
      params.preferredModel || PRIMARY_GEMINI_MODEL,
      ...FALLBACK_GEMINI_MODELS,
    ])
  );

  let lastError: unknown = null;
  for (const model of candidateModels) {
    try {
      const response = await client.models.generateContent({
        model,
        contents: params.contents as never,
        config: params.config as never,
      });
      const text = (response.text ?? '').trim();
      if (text) {
        return text;
      }
    } catch (err: unknown) {
      console.warn(`[Gemini] Model ${model} encountered an issue, trying fallback if available:`, (err as { status?: number; message?: string })?.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error('Gagal memproses permintaan AI pada semua model.');
}

