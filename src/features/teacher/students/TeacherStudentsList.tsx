'use client';
// src/features/teacher/students/TeacherStudentsList.tsx
// Teacher's "Siswa Saya" page — searchable grid of mentored students with link to detail.

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search, GraduationCap, Sparkles, Coins, BookOpen,
  MessageCircle, ExternalLink, ChevronRight, Users,
} from 'lucide-react';
import type { TeacherStudentCardData } from '@/features/users/queries';

interface Props {
  students: TeacherStudentCardData[];
}

export function TeacherStudentsList({ students }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        s.email_or_phone.toLowerCase().includes(q) ||
        (s.grade && s.grade.toLowerCase().includes(q)) ||
        (s.active_module && s.active_module.toLowerCase().includes(q))
    );
  }, [students, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:bg-purple-500/20 dark:text-purple-300 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              Siswa Bimbingan Saya
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-purple-900/40 dark:text-purple-300 border border-blue-200/60 dark:border-purple-700/50">
                {students.length} Siswa
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pantau progres belajar, modul, badge, sertifikat, dan tugas siswa Anda.
            </p>
          </div>
        </div>

        {students.length > 0 && (
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, kelas, atau modul…"
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs
                bg-white dark:bg-zinc-800/70 text-slate-900 dark:text-white
                border border-slate-200/80 dark:border-zinc-700/60
                focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:focus:ring-purple-500/40 transition-all"
            />
          </div>
        )}
      </div>

      {/* Empty state */}
      {students.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200/80 dark:border-zinc-800 p-12 text-center bg-slate-50/50 dark:bg-zinc-900/40">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-600 dark:bg-purple-500/20 dark:text-purple-300 flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-8 h-8" />
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-white">Belum Ada Siswa Bimbingan</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto mt-1">
            Admin dapat mendaftarkan siswa ke akun Anda di menu Manajemen Pengguna.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 italic py-8 text-center">
          Tidak ada siswa yang cocok dengan pencarian &ldquo;{search}&rdquo;.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => {
            const isPhone = !s.email_or_phone.includes('@') && /^\d+$/.test(s.email_or_phone.replace(/\D/g, ''));
            const cleanPhone = s.email_or_phone.replace(/\D/g, '');
            const waNumber = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
            const contactUrl = isPhone ? `https://wa.me/${waNumber}` : `mailto:${s.email_or_phone}`;

            return (
              <div
                key={s.id}
                className="group rounded-2xl bg-white dark:bg-zinc-800/50 border border-blue-200/60 dark:border-purple-500/20
                  hover:border-blue-400 dark:hover:border-purple-500/50 hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col"
              >
                {/* Top gradient bar */}
                <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 dark:from-purple-500 dark:via-indigo-500 dark:to-blue-500" />

                <div className="p-5 flex flex-col gap-4 flex-1">
                  {/* Avatar + Info */}
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-purple-500 dark:to-indigo-600 text-white font-extrabold flex items-center justify-center text-base shadow-sm flex-shrink-0">
                      {s.full_name[0]?.toUpperCase() ?? 'S'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                          {s.full_name}
                        </h3>
                        {s.grade && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-700/60 text-slate-600 dark:text-zinc-300">
                            Kelas {s.grade}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {s.email_or_phone}
                      </p>
                    </div>
                  </div>

                  {/* Module status */}
                  <div className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/60 dark:border-zinc-700/60">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5 flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-blue-500 dark:text-purple-400" /> Modul Aktif
                    </p>
                    <p className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                      {s.active_module ?? <span className="text-slate-400 dark:text-slate-600 font-normal italic">Belum ada</span>}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                      <Sparkles className="w-3 h-3" /> {s.total_xp} XP
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                      <Coins className="w-3 h-3" /> {s.coins}
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400">
                      <GraduationCap className="w-3 h-3" /> {s.session_count} Sesi
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-auto pt-3 border-t border-slate-100 dark:border-zinc-800">
                    <Link
                      href={`/teacher/students/${s.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold
                        bg-blue-600 hover:bg-blue-500 dark:bg-purple-600 dark:hover:bg-purple-500
                        text-white transition-all active:scale-95 group-hover:shadow-md"
                    >
                      Lihat Detail
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                    {contactUrl && (
                      <a
                        href={contactUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold
                          bg-slate-100 dark:bg-zinc-700/60 text-slate-700 dark:text-zinc-300
                          hover:bg-slate-200 dark:hover:bg-zinc-600 transition-all"
                      >
                        {isPhone ? <MessageCircle className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
