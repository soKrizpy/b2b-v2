import type { CertificateTier } from '@/types/database';

export const CERTIFICATE_TIER_CONFIG: Record<CertificateTier, {
  label: string;
  color: string;
  bg: string;
  ring: string;
  medal: string;
  description: string;
  scoreRange: string;
}> = {
  excellent: {
    label: 'Excellent',
    medal: '🏆',
    description: 'Skor 86–100 — penguasaan materi istimewa.',
    scoreRange: '86–100',
    color: 'text-amber-950 dark:text-amber-100',
    bg: 'bg-gradient-to-br from-amber-50 via-yellow-100 to-amber-200 dark:from-amber-950/70 dark:via-yellow-950/50 dark:to-amber-900/50',
    ring: 'ring-amber-400/80 dark:ring-amber-500/70',
  },
  achievement: {
    label: 'Achievement',
    medal: '🥈',
    description: 'Skor 75–85 — pencapaian belajar yang membanggakan.',
    scoreRange: '75–85',
    color: 'text-slate-800 dark:text-slate-100',
    bg: 'bg-gradient-to-br from-slate-50 via-slate-200 to-zinc-300 dark:from-slate-900/70 dark:via-slate-800/70 dark:to-zinc-800/70',
    ring: 'ring-slate-400/80 dark:ring-slate-400/70',
  },
  completion: {
    label: 'Participant',
    medal: '🎖️',
    description: 'Skor di bawah 75 — sertifikat partisipasi atas penyelesaian ujian.',
    scoreRange: '<75',
    color: 'text-orange-900 dark:text-orange-200',
    bg: 'bg-gradient-to-br from-orange-50 via-amber-100 to-orange-200 dark:from-orange-950/60 dark:via-amber-950/40 dark:to-orange-900/40',
    ring: 'ring-orange-300/80 dark:ring-orange-600/70',
  },
};
