'use client';
// src/features/ai/components/AiCurriculumGenerator.tsx
// Admin tool: generate curriculum JSON from a topic title using Gemini.
// Renders a floating panel that outputs into the parent's import textarea.

import { useState, useActionState, useEffect, useRef } from 'react';
import { generateCurriculum, type AiResult } from '@/features/ai/actions';

interface Props {
  moduleTitle: string;
  onGenerated: (json: string) => void;
}

export function AiCurriculumGenerator({ moduleTitle, onGenerated }: Props) {
  const [open,   setOpen]   = useState(false);
  const [state,  dispatch,  pending] = useActionState<AiResult | null, FormData>(
    generateCurriculum, null
  );
  const onGeneratedRef = useRef(onGenerated);
  onGeneratedRef.current = onGenerated;
  const generatedData = state?.success ? state.data : null;

  // Auto-fill parent when successful
  useEffect(() => {
    if (generatedData) {
      onGeneratedRef.current(generatedData);
    }
  }, [generatedData]);

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold
          bg-gradient-to-r from-violet-600 to-purple-600 text-white
          shadow-md shadow-purple-500/25 hover:shadow-purple-500/45
          hover:-translate-y-0.5 active:scale-95 transition-all duration-150"
      >
        <span className="text-sm">✨</span>
        Generate dengan AI
      </button>

      {/* Panel */}
      {open && (
        <div className="mt-4 rounded-2xl bg-zinc-900/80 border border-purple-500/30
          shadow-xl shadow-purple-900/20 backdrop-blur-md p-5 flex flex-col gap-4">

          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl select-none">✨</span>
              <div>
                <p className="text-sm font-black text-white leading-none">AI Curriculum Generator</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">Powered by Gemini 2.0 Flash</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700
                flex items-center justify-center text-zinc-400 text-xs transition-colors"
            >
              ✕
            </button>
          </div>

          <form action={dispatch} className="flex flex-col gap-3">
            <input type="hidden" name="module_title" value={moduleTitle} />

            {/* Topic title */}
            <div className="flex flex-col gap-1">
              <label htmlFor="ai-topic" className="text-xs font-bold text-zinc-300">
                Judul Topik <span className="text-red-400">*</span>
              </label>
              <input
                id="ai-topic"
                name="topic_title"
                required
                placeholder="Contoh: Pengenalan Variabel di Python"
                className="rounded-xl border border-zinc-700 bg-zinc-800/80 px-3.5 py-2.5
                  text-sm text-white placeholder:text-zinc-500
                  focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Level */}
            <div className="flex flex-col gap-1">
              <label htmlFor="ai-level" className="text-xs font-bold text-zinc-300">Level</label>
              <select
                id="ai-level"
                name="level"
                defaultValue="beginner"
                className="rounded-xl border border-zinc-700 bg-zinc-800/80 px-3.5 py-2.5
                  text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="beginner" className="bg-zinc-950 text-white">Beginner</option>
                <option value="intermediate" className="bg-zinc-950 text-white">Intermediate</option>
                <option value="advanced" className="bg-zinc-950 text-white">Advanced</option>
              </select>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={pending}
              className="py-2.5 rounded-xl text-sm font-extrabold text-black
                bg-gradient-to-r from-amber-400 to-orange-500
                shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150
                flex items-center justify-center gap-2"
            >
              {pending ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-black/30 border-t-black
                    rounded-full animate-spin" />
                  Sedang Membuat…
                </>
              ) : (
                <>✨ Generate Kurikulum</>
              )}
            </button>
          </form>

          {/* Error */}
          {state && !state.success && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 flex items-start gap-2">
              <span className="text-red-400 flex-shrink-0">✗</span>
              <p className="text-xs text-red-300">{state.error}</p>
            </div>
          )}

          {/* Success */}
          {state?.success && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30
              px-4 py-3 flex items-start gap-2">
              <span className="text-emerald-400 flex-shrink-0">✓</span>
              <p className="text-xs text-emerald-300 font-bold">
                JSON berhasil di-generate! Konten sudah masuk ke editor import.
                Periksa dan klik &ldquo;Import JSON Materi&rdquo; untuk menyimpan.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
