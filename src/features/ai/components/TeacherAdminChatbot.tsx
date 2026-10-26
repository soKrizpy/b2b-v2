'use client';
// src/features/ai/components/TeacherAdminChatbot.tsx
// Floating AI Copilot for Teachers and Admins ONLY.
// Provides pedagogical advice, curriculum planning, quiz drafting, and progress feedback ideas.

import { useState, useRef, useEffect, useTransition, useCallback } from 'react';
import { chatWithTutor, type ChatMessage } from '@/features/ai/actions';
import { X, Send, Bot, RefreshCw, ChevronDown, BookOpen } from 'lucide-react';

interface Props {
  role: 'teacher' | 'admin';
}

const QUICK_PROMPTS: Record<'teacher' | 'admin', Array<{ label: string; prompt: string }>> = {
  teacher: [
    {
      label: '💡 Ide Proyek Coding',
      prompt: 'Berikan 3 ide mini-proyek coding (Python/Scratch) yang seru untuk siswa tingkat pemula yang baru belajar percabangan (if-else).',
    },
    {
      label: '🎯 Bantuan Siswa Kesulitan',
      prompt: 'Bagaimana pendekatan terbaik mengajarkan konsep perulangan (loops) kepada siswa yang sering bingung dengan indeks dan kondisi henti?',
    },
    {
      label: '📝 Draf 3 Soal Kuis',
      prompt: 'Buatkan 3 soal pilihan ganda tentang konsep dasar Function dan Return Value beserta pembahasan singkat dan kunci jawabannya.',
    },
    {
      label: '📑 Catatan Evaluasi Siswa',
      prompt: 'Bantu buat draf catatan evaluasi positif dan konstruktif untuk siswa yang aktif mencoba tetapi masih sering salah penulisan sintaks (syntax error).',
    },
  ],
  admin: [
    {
      label: '📚 Evaluasi Struktur Modul',
      prompt: 'Bagaimana urutan silabus yang ideal untuk kurikulum Fullstack Web Development pemula (dari HTML, CSS, JavaScript, hingga dasar Backend)?',
    },
    {
      label: '⚡ Standar Kualitas Kuis',
      prompt: 'Berikan panduan checklist untuk memastikan soal kuis dan tantangan koding pada kurikulum memiliki tingkat kesulitan bertingkat (scaffolding).',
    },
    {
      label: '📈 Optimasi Keterlibatan Siswa',
      prompt: 'Berikan strategi gamifikasi dan insentif pembelajaran terbaik untuk meningkatkan tingkat penyelesaian materi (completion rate) siswa di LMS.',
    },
    {
      label: '💬 Template Pengumuman Guru',
      prompt: 'Buatkan draf pengumuman untuk para guru tentang jadwal review tugas dan panduan pengisian laporan evaluasi bulanan.',
    },
  ],
};

function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-sm ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-white'
        }`}
      >
        {isUser ? '👤' : <Bot className="w-4 h-4" />}
      </div>

      <div
        className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
          isUser
            ? 'bg-blue-600 text-white rounded-tr-none'
            : 'bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 border border-slate-200 dark:border-zinc-700/70 rounded-tl-none'
        }`}
      >
        <p className="whitespace-pre-wrap font-sans">{msg.content}</p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-white shadow-sm">
        <Bot className="w-4 h-4" />
      </div>
      <div className="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700/70 rounded-2xl rounded-tl-none px-4 py-3 flex gap-1.5 shadow-sm">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

export function TeacherAdminChatbot({ role }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [pending, startSend] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, pending]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  const sendMessage = useCallback(
    (customText?: string) => {
      const msg = (customText ?? input).trim();
      if (!msg || pending) return;

      const userMsg: ChatMessage = { role: 'user', content: msg };
      if (!customText) setInput('');
      setError(null);

      setHistory((prev) => [...prev, userMsg]);

      const fd = new FormData();
      fd.append('topic_title', role === 'admin' ? 'Konsultasi Manajemen & Kurikulum Admin' : 'Asistensi Pengajaran & Materi Guru');
      fd.append('topic_context', `Pengguna: ${role === 'admin' ? 'Administrator' : 'Guru Pengajar'}. Membutuhkan bantuan asistensi profesional Bits2Bytes.`);
      fd.append('message', msg);
      fd.append('history', JSON.stringify(history));

      startSend(async () => {
        const res = await chatWithTutor(null, fd);
        if (res.success) {
          setHistory((prev) => [...prev, { role: 'model', content: res.data }]);
        } else {
          setError(res.error);
          setHistory((prev) => prev.slice(0, -1));
        }
      });
    },
    [input, pending, history, role]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const roleLabel = role === 'admin' ? 'Admin' : 'Guru';
  const prompts = QUICK_PROMPTS[role] ?? QUICK_PROMPTS.teacher;

  return (
    <aside
      aria-label="Byte Copilot AI"
      className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 flex flex-col items-end"
    >
      {/* ── Chat Modal Window ────────────────────────────────────────────── */}
      {open && (
        <div
          role="dialog"
          aria-label={`Ahlul Bytes untuk ${roleLabel}`}
          className="mb-3 w-[calc(100vw-2rem)] sm:w-[420px] h-[min(520px,calc(100dvh-7rem))] max-h-[calc(100dvh-7rem)] min-h-0 flex flex-col
            rounded-3xl shadow-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800
            overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Header */}
          <div className="shrink-0 px-4 py-3 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/25">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-sm tracking-tight text-white">Ahlul Bytes</h3>
                  <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-amber-200 font-mono">
                    {roleLabel}
                  </span>
                </div>
                <p className="text-[10px] text-indigo-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Asisten Khusus Pengajar &amp; Admin
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setHistory([]);
                    setError(null);
                  }}
                  title="Bersihkan Percakapan"
                  className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                title="Tutup Chatbot"
                className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Conversation history area */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 space-y-3.5 text-xs">
            {history.length === 0 && (
              <div className="py-4 px-2 space-y-4">
                <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 text-indigo-900 dark:text-indigo-200 space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Selamat datang di Ahlul Bytes, {roleLabel}!
                  </p>
                  <p className="text-[11px] leading-relaxed text-slate-600 dark:text-indigo-300">
                    Gunakan asisten ini untuk merancang bank soal kuis, kurikulum, ide tantangan coding, atau saran pedagogis untuk siswa Anda.
                  </p>
                </div>

                {/* Quick Prompts */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    Saran Aksi Cepat:
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {prompts.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => sendMessage(p.prompt)}
                        className="text-left px-3 py-2 rounded-xl bg-white dark:bg-zinc-800/80 hover:bg-indigo-50 dark:hover:bg-zinc-700/60 border border-slate-200 dark:border-zinc-700/60 text-slate-700 dark:text-zinc-300 text-[11px] font-semibold transition-all hover:scale-[1.01] active:scale-98 shadow-xs"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {history.map((msg, i) => (
              <Bubble key={i} msg={msg} />
            ))}

            {pending && <TypingIndicator />}

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px]">
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input Footer */}
          <div className="shrink-0 p-3 bg-white dark:bg-zinc-800/90 border-t border-slate-200 dark:border-zinc-800 flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Tanya ide kurikulum, kuis, atau evaluasi ${roleLabel}...`}
              rows={2}
              className="flex-1 resize-none rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 p-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              disabled={!input.trim() || pending}
              onClick={() => sendMessage()}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-all shadow-md active:scale-95 flex-shrink-0"
              title="Kirim Pesan"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Floating Action Trigger Button ──────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full
          bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white
          shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95
          border border-white/25 transition-all duration-200 select-none cursor-pointer"
        aria-label="Buka Ahlul Bytes untuk Guru dan Admin"
      >
        <div className="relative">
          <Bot className="w-5 h-5 text-amber-300 group-hover:rotate-12 transition-transform duration-200" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-indigo-900 animate-pulse" />
        </div>
        <div className="text-left hidden sm:block">
          <p className="text-[11px] font-black leading-none tracking-tight flex items-center gap-1 text-white">
            <span>Ahlul Bytes</span>
            <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-white/20 text-amber-300 font-mono">
              {roleLabel}
            </span>
          </p>
          <p className="text-[9px] text-indigo-200 font-medium leading-none mt-0.5">Asisten AI Khusus</p>
        </div>
        {open ? <X className="w-4 h-4 text-white/80" /> : null}
      </button>
    </aside>
  );
}
