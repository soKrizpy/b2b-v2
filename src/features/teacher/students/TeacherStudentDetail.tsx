'use client';
// src/features/teacher/students/TeacherStudentDetail.tsx
// Full student profile for teacher view — tabbed: Overview, Quest Map, Badge & Sertifikat, Tugas, Sesi.

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDate } from '@/lib/formatDate';
import {
  ArrowLeft, Sparkles, Coins, GraduationCap, BookOpen, Trophy,
  ScrollText, ClipboardList, CalendarDays, CheckCircle2, XCircle,
  Clock, ChevronRight, ChevronDown, ChevronUp, Star, Award,
  Layers, FileCheck2, MessageCircle, ExternalLink,
} from 'lucide-react';
import type { TeacherStudentProfile } from '@/features/users/teacherStudentQueries';

type Tab = 'overview' | 'questmap' | 'badges' | 'submissions' | 'sessions';

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'overview',    label: 'Overview',          icon: Layers },
  { key: 'questmap',   label: 'Quest Map',          icon: BookOpen },
  { key: 'badges',     label: 'Badge & Sertifikat', icon: Trophy },
  { key: 'submissions',label: 'Tugas',              icon: FileCheck2 },
  { key: 'sessions',   label: 'Sesi Belajar',       icon: CalendarDays },
];

const TIER_MEDAL: Record<string, string> = {
  achievement: '🥇',
  excellent:   '🥈',
  completion:  '🥉',
};

function isSupabaseStorageImage(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:'
      && parsed.hostname.endsWith('.supabase.co')
      && parsed.pathname.startsWith('/storage/v1/object/');
  } catch {
    return false;
  }
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:  { label: 'Menunggu Review', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200/60 dark:border-amber-700/40' },
  approved: { label: 'Disetujui', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200/60 dark:border-emerald-700/40' },
  rejected: { label: 'Ditolak', color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border-rose-200/60 dark:border-rose-700/40' },
};

interface Props {
  student: TeacherStudentProfile;
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-white dark:bg-zinc-800/50 border border-slate-200/60 dark:border-zinc-700/60 p-4 gap-1 text-center">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-1 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-lg font-black text-slate-900 dark:text-white">{value}</span>
      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
    </div>
  );
}

function ModuleAccordion({ mod }: { mod: TeacherStudentProfile['modules'][number] }) {
  const [open, setOpen] = useState(false);
  const completedTopics = mod.topics.filter((t) => t.quiz_passed === true).length;
  const progress = mod.topics.length > 0 ? Math.round((completedTopics / mod.topics.length) * 100) : 0;

  const statusColor: Record<string, string> = {
    active:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    inactive:  'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-slate-400',
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-800/50 border border-slate-200/60 dark:border-zinc-700/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-zinc-700/30 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-purple-500/20 flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-5 h-5 text-blue-600 dark:text-purple-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{mod.title}</span>
            {mod.level && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-700/60 text-slate-600 dark:text-zinc-300">
                {mod.level}
              </span>
            )}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor[mod.status] ?? statusColor.inactive}`}>
              {mod.status === 'active' ? 'Aktif' : mod.status === 'completed' ? 'Selesai' : 'Tidak Aktif'}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-zinc-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-purple-500 dark:to-indigo-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 flex-shrink-0">
              {completedTopics}/{mod.topics.length} topik
            </span>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />}
      </button>

      {open && mod.topics.length > 0 && (
        <div className="border-t border-slate-100 dark:border-zinc-700/60 px-4 py-3 space-y-2">
          {mod.topics.map((t, i) => (
            <div
              key={t.topic_id}
              className="flex items-center gap-3 py-2 border-b border-slate-50 dark:border-zinc-800 last:border-0"
            >
              <span className="text-xs font-black text-slate-400 dark:text-slate-600 w-5 text-center">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{t.title}</p>
              </div>
              {t.quiz_score !== null ? (
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    t.quiz_passed
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                  }`}>
                    {t.quiz_passed ? '✓' : '✗'} {t.quiz_score}%
                  </span>
                </div>
              ) : (
                <span className="text-[10px] text-slate-400 dark:text-slate-600 italic">Belum quiz</span>
              )}
            </div>
          ))}
        </div>
      )}

      {open && mod.topics.length === 0 && (
        <p className="px-4 py-3 text-xs text-slate-400 dark:text-slate-600 italic border-t border-slate-100 dark:border-zinc-700/60">
          Tidak ada topik di modul ini.
        </p>
      )}
    </div>
  );
}

export function TeacherStudentDetail({ student }: Props) {
  const [tab, setTab] = useState<Tab>('overview');

  const isPhone = !student.email_or_phone.includes('@') && /^\d+$/.test(student.email_or_phone.replace(/\D/g, ''));
  const cleanPhone = student.email_or_phone.replace(/\D/g, '');
  const waNumber = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
  const contactUrl = isPhone ? `https://wa.me/${waNumber}` : `mailto:${student.email_or_phone}`;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/teacher/students"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400
          hover:text-blue-600 dark:hover:text-purple-300 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Kembali ke Daftar Siswa
      </Link>

      {/* Profile Hero */}
      <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 dark:from-slate-950 dark:via-purple-950 dark:to-slate-900 border border-blue-400/40 dark:border-purple-500/40 shadow-xl p-6 sm:p-8 text-white">
        <div className="flex items-center gap-5 flex-wrap">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md text-white font-black text-2xl flex items-center justify-center shadow-md border border-white/20 flex-shrink-0">
            {student.full_name[0]?.toUpperCase() ?? 'S'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-white">{student.full_name}</h1>
              {student.grade && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-white border border-white/20">
                  Kelas {student.grade}
                </span>
              )}
            </div>
            <p className="text-sm text-blue-200 dark:text-purple-300 mt-0.5">{student.email_or_phone}</p>
            {student.bio && (
              <p className="text-xs text-white/70 mt-1 italic">&ldquo;{student.bio}&rdquo;</p>
            )}
          </div>
          {contactUrl && (
            <a
              href={contactUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/20 text-white transition-all"
            >
              {isPhone ? <MessageCircle className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
              {isPhone ? 'WhatsApp' : 'Email'}
            </a>
          )}
        </div>

        {/* Quick stats row */}
        <div className="mt-5 flex flex-wrap gap-2">
          {[
            { icon: '⭐', label: `${student.total_xp} XP` },
            { icon: '🪙', label: `${student.coins} Koin` },
            { icon: '📚', label: `${student.modules.length} Modul` },
            { icon: '🎓', label: `${student.cert_count} Sertifikat` },
            { icon: '🏅', label: `${student.badge_count} Badge` },
            { icon: '📋', label: `${student.submission_count} Tugas` },
            { icon: '🎯', label: `${student.session_count} Sesi Hadir` },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-1.5 text-xs font-bold text-white border border-white/20">
              <span>{s.icon}</span> {s.label}
            </div>
          ))}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/60 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all flex-shrink-0 ${
              tab === key
                ? 'bg-white dark:bg-zinc-700 text-blue-700 dark:text-purple-300 shadow-sm border border-blue-200/60 dark:border-purple-500/40'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Stat grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard icon={Sparkles} label="Total XP"      value={student.total_xp}         color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300" />
            <StatCard icon={Coins}    label="Koin"          value={student.coins}             color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300" />
            <StatCard icon={BookOpen} label="Modul"         value={student.modules.length}    color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300" />
            <StatCard icon={Trophy}   label="Badge"         value={student.badge_count}       color="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300" />
            <StatCard icon={ScrollText} label="Sertifikat"  value={student.cert_count}        color="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300" />
            <StatCard icon={GraduationCap} label="Sesi Hadir" value={student.session_count}  color="bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300" />
          </div>

          {/* Recent sessions */}
          {student.sessions.length > 0 && (
            <div className="rounded-2xl bg-white dark:bg-zinc-800/50 border border-slate-200/60 dark:border-zinc-700/60 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-zinc-700/60">
                <h2 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-blue-500 dark:text-purple-400" />
                  Sesi Terakhir
                </h2>
                <button type="button" onClick={() => setTab('sessions')} className="text-xs font-bold text-blue-600 dark:text-purple-400 hover:underline flex items-center gap-1">
                  Lihat Semua <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="divide-y divide-slate-50 dark:divide-zinc-800">
                {student.sessions.slice(0, 3).map((s) => (
                  <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      s.has_joined ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-400 dark:bg-zinc-800 dark:text-slate-600'
                    }`}>
                      {s.has_joined ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {s.subject ?? 'Sesi Belajar'}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        {formatDate(s.meeting_date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      s.has_joined ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-slate-500'
                    }`}>
                      {s.has_joined ? 'Hadir' : 'Tidak Hadir'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent submissions */}
          {student.submissions.length > 0 && (
            <div className="rounded-2xl bg-white dark:bg-zinc-800/50 border border-slate-200/60 dark:border-zinc-700/60 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-zinc-700/60">
                <h2 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-blue-500 dark:text-purple-400" />
                  Tugas Terbaru
                </h2>
                <button type="button" onClick={() => setTab('submissions')} className="text-xs font-bold text-blue-600 dark:text-purple-400 hover:underline flex items-center gap-1">
                  Lihat Semua <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="divide-y divide-slate-50 dark:divide-zinc-800">
                {student.submissions.slice(0, 3).map((sub) => {
                  const sc = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.pending;
                  return (
                    <div key={sub.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {sub.challenge_title ?? 'Tugas'}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                          {sub.module_title}{sub.topic_title ? ` › ${sub.topic_title}` : ''}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${sc.color}`}>
                        {sc.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'questmap' && (
        <div className="space-y-3">
          {student.modules.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-800 p-10 text-center">
              <BookOpen className="w-10 h-10 text-slate-300 dark:text-zinc-700 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-500 dark:text-slate-500">Belum ada modul yang di-enroll</p>
            </div>
          ) : (
            student.modules.map((mod) => (
              <ModuleAccordion key={mod.module_id} mod={mod} />
            ))
          )}
        </div>
      )}

      {tab === 'badges' && (
        <div className="space-y-6">
          {/* Badges */}
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-violet-500" /> Badge ({student.badges.length})
            </h2>
            {student.badges.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-800 p-8 text-center">
                <p className="text-sm font-bold text-slate-400 dark:text-slate-600">Belum ada badge</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {student.badges.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-2xl bg-white dark:bg-zinc-800/50 border border-slate-200/60 dark:border-zinc-700/60 p-4 flex flex-col items-center gap-2 text-center hover:border-violet-300 dark:hover:border-violet-500/50 transition-colors"
                  >
                    {b.icon_url ? (
                      <Image
                        src={b.icon_url}
                        alt={b.name}
                        width={48}
                        height={48}
                        unoptimized={!isSupabaseStorageImage(b.icon_url)}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                        <Award className="w-6 h-6 text-violet-600 dark:text-violet-300" />
                      </div>
                    )}
                    <p className="font-extrabold text-xs text-slate-900 dark:text-white">{b.name}</p>
                    {b.description && (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">{b.description}</p>
                    )}
                    <p className="text-[10px] text-slate-400 dark:text-slate-600">
                      {formatDate(b.earned_at, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Certificates */}
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-indigo-500" /> Sertifikat ({student.certificates.length})
            </h2>
            {student.certificates.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-800 p-8 text-center">
                <p className="text-sm font-bold text-slate-400 dark:text-slate-600">Belum ada sertifikat</p>
              </div>
            ) : (
              <div className="space-y-3">
                {student.certificates.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-2xl bg-white dark:bg-zinc-800/50 border border-slate-200/60 dark:border-zinc-700/60 p-4 flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-2xl flex-shrink-0">
                      {TIER_MEDAL[c.tier] ?? '📜'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                        {c.module_title ?? 'Modul'}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                        #{c.certificate_number}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 justify-end mb-1">
                        <Star className="w-3 h-3 text-amber-500" />
                        <span className="text-sm font-black text-amber-600 dark:text-amber-400">{c.score}%</span>
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        {formatDate(c.issued_at, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'submissions' && (
        <div className="space-y-3">
          {student.submissions.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-800 p-10 text-center">
              <FileCheck2 className="w-10 h-10 text-slate-300 dark:text-zinc-700 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-500 dark:text-slate-500">Belum ada tugas yang dikumpulkan</p>
            </div>
          ) : (
            student.submissions.map((sub) => {
              const sc = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.pending;
              return (
                <div key={sub.id} className="rounded-2xl bg-white dark:bg-zinc-800/50 border border-slate-200/60 dark:border-zinc-700/60 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {sub.challenge_title ?? 'Tugas'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sc.color}`}>
                          {sc.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {sub.module_title}{sub.topic_title ? ` › ${sub.topic_title}` : ''}
                      </p>
                      {sub.submission_note && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 bg-slate-50 dark:bg-zinc-800 rounded-xl px-3 py-2">
                          &ldquo;{sub.submission_note}&rdquo;
                        </p>
                      )}
                      {sub.review_note && (
                        <p className="text-xs text-blue-700 dark:text-purple-300 mt-1.5 bg-blue-50 dark:bg-purple-900/20 rounded-xl px-3 py-2">
                          💬 {sub.review_note}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <p className="text-[10px] text-slate-400 dark:text-slate-600">
                        {formatDate(sub.submitted_at, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      {sub.submission_url && (
                        <a
                          href={sub.submission_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-purple-400 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" /> Lihat File
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'sessions' && (
        <div className="space-y-3">
          {student.sessions.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-800 p-10 text-center">
              <CalendarDays className="w-10 h-10 text-slate-300 dark:text-zinc-700 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-500 dark:text-slate-500">Belum ada sesi belajar</p>
            </div>
          ) : (
            student.sessions.map((s) => (
              <div key={s.id} className="rounded-2xl bg-white dark:bg-zinc-800/50 border border-slate-200/60 dark:border-zinc-700/60 p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    s.has_joined
                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-400 dark:bg-zinc-800 dark:text-slate-600'
                  }`}>
                    {s.has_joined ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {s.subject ?? 'Sesi Belajar'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        s.has_joined ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-slate-500'
                      }`}>
                        {s.has_joined ? '✓ Hadir' : '✗ Tidak Hadir'}
                      </span>
                      {s.is_completed && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          Selesai
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                      <Clock className="w-3 h-3" />
                      {formatDate(s.meeting_date)}
                    </div>
                    {s.progress_report && (
                      <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-zinc-800 rounded-xl px-3 py-2">
                        <span className="font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wide">Laporan Progres · </span>
                        {s.progress_report}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
