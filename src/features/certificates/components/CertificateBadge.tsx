// src/features/certificates/components/CertificateBadge.tsx
// Reusable badge displayed on Student Dashboard and Parent Report.
import Link from 'next/link';
import { TIER_CONFIG } from '../queries';
import type { CertificateRow, CertificateTier } from '@/types/database';

interface CertificateBadgeProps {
  cert: Pick<CertificateRow, 'tier' | 'score' | 'certificate_number' | 'issued_at' | 'verification_token'> & {
    module_title?: string | null;
  };
  variant?: 'compact' | 'full';
}

export function CertificateBadge({ cert, variant = 'compact' }: CertificateBadgeProps) {
  const cfg = TIER_CONFIG[cert.tier as CertificateTier];

  if (variant === 'compact') {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full
          ring-1 text-xs font-bold ${cfg.bg} ${cfg.color} ${cfg.ring}`}
        title={`${cfg.label} Certificate — ${cert.score}/100 (${cert.certificate_number})`}
      >
        <span aria-hidden="true">{cfg.medal}</span>
        <span>{cert.module_title ?? 'Modul'}</span>
        <span className="opacity-60 font-mono text-[10px]">#{cert.certificate_number}</span>
      </div>
    );
  }

  return (
    <article
      className={`rounded-2xl border-2 border-double ring-1 p-5 flex items-start gap-4 shadow-sm
        ${cfg.bg} ${cfg.ring}`}
      aria-label={`${cfg.label} Certificate untuk ${cert.module_title ?? 'modul ini'}`}
    >
      <span className="text-4xl flex-shrink-0" aria-hidden="true">{cfg.medal}</span>
      <div className="min-w-0 flex-1">
        <p className={`font-extrabold text-base ${cfg.color}`}>{cfg.label} Certificate</p>
        {cert.module_title && (
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-0.5 truncate">
            {cert.module_title}
          </p>
        )}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <span className={`text-2xl font-extrabold tabular-nums ${cfg.color}`}>
            {cert.score}<span className="text-sm font-normal opacity-60">/100</span>
          </span>
          <span className="text-xs font-mono text-slate-400 dark:text-slate-500">#{cert.certificate_number}</span>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {new Date(cert.issued_at).toLocaleDateString('id-ID', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </span>
        </div>
        <p className={`text-xs mt-1.5 ${cfg.color} opacity-80`}>{cfg.description}</p>
        <Link
          href={`/verify/${cert.verification_token}`}
          className="no-print inline-flex items-center gap-2 mt-4 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-slate-800"
        >
          <span aria-hidden="true">↗</span>
          Lihat &amp; Unduh Sertifikat
        </Link>
      </div>
    </article>
  );
}
