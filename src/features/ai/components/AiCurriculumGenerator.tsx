'use client';
// src/features/ai/components/AiCurriculumGenerator.tsx
// Admin tool: generate curriculum JSON from a topic title using Gemini API.
// Uses dedicated route handler /api/ai/generate-curriculum to avoid Next.js Server Action timeouts.

import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

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

  // Cycle loading messages while generating
  useEffect(() => {
    if (!loading) {
      setStageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setStageIndex((prev) => (prev + 1) % LOADING_STAGES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [loading]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic_title: topicTitle.trim(),
          level,
          module_title: moduleTitle,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Gagal menghasilkan kurikulum dengan AI. Coba lagi.');
      }

      setSuccess(true);
      if (typeof result.data === 'string') {
        onGeneratedRef.current(result.data);
      }
    } catch (err: unknown) {
      console.error('[AiCurriculumGenerator] Error:', err);
      setError((err as { message?: string })?.message || 'Terjadi gangguan saat memproses AI. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

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
        <Sparkles className="w-4 h-4 text-amber-300" />
        <span>Generate dengan AI</span>
      </button>

      {/* Panel */}
      {open && (
        <div className="mt-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]
          shadow-xl shadow-slate-900/10 dark:shadow-purple-900/20 backdrop-blur-md p-5 flex flex-col gap-4">

          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-purple-300" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white leading-none">AI Curriculum Generator</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Asisten Gemini AI Bits2Bytes</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-lg bg-[var(--surface-raised)] hover:bg-[var(--table-hover)] border border-[var(--border)]
                flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-xs transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {/* Topic title */}
            <div className="flex flex-col gap-1">
              <label htmlFor="ai-topic" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Judul Topik <span className="text-red-400">*</span>
              </label>
              <input
                id="ai-topic"
                name="topic_title"
                value={topicTitle}
                onChange={(e) => setTopicTitle(e.target.value)}
                required
                disabled={loading}
                placeholder="Contoh: Pengenalan Variabel di Python"
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3.5 py-2.5
                  text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500
                  focus:outline-none focus:ring-2 focus:ring-[var(--border-hover)] disabled:opacity-50"
              />
            </div>

            {/* Level */}
            <div className="flex flex-col gap-1">
              <label htmlFor="ai-level" className="text-xs font-bold text-slate-700 dark:text-slate-300">Level Pembelajaran</label>
              <select
                id="ai-level"
                name="level"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                disabled={loading}
                className="rounded-xl border border-zinc-700 bg-zinc-800/80 px-3.5 py-2.5
                  text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              >
                <option value="beginner">Beginner (Pemula)</option>
                <option value="intermediate">Intermediate (Menengah)</option>
                <option value="advanced">Advanced (Lanjutan)</option>
              </select>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="py-2.5 rounded-xl text-sm font-extrabold text-black
                bg-gradient-to-r from-amber-400 to-orange-500
                shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95
                disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150
                flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>{LOADING_STAGES[stageIndex]}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-black" />
                  <span>Generate Kurikulum</span>
                </>
              )}
            </button>
          </form>

          {/* Error Message */}
          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 px-4 py-3 flex items-start gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40
              px-4 py-3 flex items-start gap-2.5 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-bold leading-relaxed">
                JSON kurikulum berhasil dibuat! Konten otomatis disematkan ke editor JSON di bawah.
                Silakan review dan klik &ldquo;Import JSON Materi&rdquo; untuk menyimpan ke database.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
