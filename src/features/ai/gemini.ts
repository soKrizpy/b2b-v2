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

export const GEMINI_FLASH_MODEL = 'gemini-3.8-flash';
