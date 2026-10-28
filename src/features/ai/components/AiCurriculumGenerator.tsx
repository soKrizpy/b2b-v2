'use client';
// src/features/ai/components/AiCurriculumGenerator.tsx
// Admin tool: generate curriculum JSON from a topic title using the dedicated API route.

import { useState, useRef, useEffect, type FormEvent } from 'react';

interface Props {
  moduleTitle: string;
  onGenerated: (json: string) => void;
}

const LOADING_STAGES = [
  'Menghubungi Gemini AI...',
  'Merancang modul & konsep pembelajaran...',
  'Menyusun latihan kode & kuis interaktif...',
  'Memvalidasi struktur JSON kurikulum...',
];

type GenerateResponse = {
  success?: boolean;
  data?: unknown;
  error?: string;
};

export function AiCurriculumGenerator({ moduleTitle, onGenerated }: Props) {
  const [open, setOpen] = useState(false);
  const [topicTitle, setTopicTitle] = useState('');
  const [level, setLevel] = useState('beginner');
  const [loading, setLoading] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onGeneratedRef = useRef(onGenerated);
  onGeneratedRef.current = onGenerated;

  useEffect(() => {
    if (!loading) {
      setStageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setStageIndex((previous) => (previous + 1) % LOADING_STAGES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [loading]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!topicTitle.trim()) {
      setError('Judul topik wajib diisi.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/ai/generate-curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic_title: topicTitle.trim(),
          level,
          module_title: moduleTitle,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as GenerateResponse;
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Gagal menghasilkan kurikulum dengan AI. Coba lagi.');
      }
      if (typeof payload.data !== 'string') {
        throw new Error('Respons AI tidak berisi JSON kurikulum yang valid. Silakan coba lagi.');
      }

      onGeneratedRef.current(payload.data);
      setSuccess(true);
    } catch (caught: unknown) {
      console.error('[AiCurriculumGenerator] Error:', caught);
      setError(
        caught instanceof Error
          ? caught.message
          : 'Terjadi gangguan saat memproses AI. Silakan coba lagi.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold
          bg-gradient-to-r from-violet-600 to-purple-600 text-white
          shadow-md shadow-purple-500/25 hover:shadow-purple-500/45
          hover:-translate-y-0.5 active:scale-95 transition-all duration-150"
      >
        <span className="text-sm">✨</span>
        Generate dengan AI
      </button>

      {open && (
        <div className="mt-4 rounded-2xl bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-purple-500/30
          shadow-xl shadow-purple-900/20 backdrop-blur-md p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl select-none">✨</span>
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white leading-none">AI Curriculum Generator</p>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">Asisten Gemini AI Bits2Bytes</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Tutup generator kurikulum"
              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700
                flex items-center justify-center text-slate-500 dark:text-zinc-400 text-xs transition-colors"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="ai-topic" className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Judul Topik <span className="text-red-400">*</span>
              </label>
              <input
                id="ai-topic"
                name="topic_title"
                value={topicTitle}
                onChange={(event) => setTopicTitle(event.target.value)}
                required
                disabled={loading}
                placeholder="Contoh: Pengenalan Variabel di Python"
                className="rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2.5
                  text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500
                  focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="ai-level" className="text-xs font-bold text-slate-700 dark:text-zinc-300">Level</label>
              <select
                id="ai-level"
                name="level"
                value={level}
                onChange={(event) => setLevel(event.target.value)}
                disabled={loading}
                className="rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2.5
                  text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              >
                <option value="beginner" className="bg-white text-slate-900 dark:bg-zinc-950 dark:text-white">Beginner</option>
                <option value="intermediate" className="bg-white text-slate-900 dark:bg-zinc-950 dark:text-white">Intermediate</option>
                <option value="advanced" className="bg-white text-slate-900 dark:bg-zinc-950 dark:text-white">Advanced</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || !topicTitle.trim()}
              className="py-2.5 rounded-xl text-sm font-extrabold text-black
                bg-gradient-to-r from-amber-400 to-orange-500
                shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150
                flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  {LOADING_STAGES[stageIndex]}
                </>
              ) : (
                <>✨ Generate Kurikulum</>
              )}
            </button>
          </form>

          {error && (
            <div role="alert" className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 px-4 py-3 flex items-start gap-2">
              <span className="text-red-700 dark:text-red-400 flex-shrink-0">✗</span>
              <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {success && (
            <div role="status" className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-4 py-3 flex items-start gap-2">
              <span className="text-emerald-700 dark:text-emerald-400 flex-shrink-0">✓</span>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                JSON berhasil di-generate! Konten sudah masuk ke editor import. Periksa dan klik &ldquo;Import JSON Materi&rdquo; untuk menyimpan.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
