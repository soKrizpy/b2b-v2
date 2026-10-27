'use client';
// src/features/invoices/components/BillingNoticeModal.tsx
// Dismissible billing notice modal shown once per session on the Town Square.
// Displayed only when the student has at least one 'sent' (unpaid) invoice.
//
// Dismiss logic:
//   - "Tutup" or backdrop click → sets sessionStorage flag so it never shows again
//     during the current browser session.
//   - Re-appears on the next fresh session (new tab / next day).
//   - "Bayar" button keeps the modal open; student copies bank account and
//     contacts admin.

import { useState, useEffect } from 'react';
import type { InvoiceRow } from '@/types/database';

interface Props {
  invoices: InvoiceRow[];  // only 'sent' invoices passed by shell
}

const SESSION_KEY = 'billing_notice_dismissed';

function fmtRp(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(n);
}

export function BillingNoticeModal({ invoices }: Props) {
  // Only show if there's at least one 'sent' (unpaid) invoice
  const unpaid = invoices.filter((inv) => inv.status === 'sent');

  // Gate: don't mount until client — avoids hydration mismatch with sessionStorage
  const [isMounted, setIsMounted] = useState(false);
  const [visible,   setVisible]   = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (unpaid.length > 0 && !sessionStorage.getItem(SESSION_KEY)) {
      setVisible(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem(SESSION_KEY, '1');
  };

  if (!isMounted || !visible || unpaid.length === 0) return null;

  // Show the most recent unpaid invoice
  const inv     = unpaid[0];
  const skipped = inv.total_meetings - inv.attended_meetings;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto overscroll-contain
        bg-black/65 backdrop-blur-sm p-3 sm:p-4"
      onClick={dismiss}
      aria-modal="true"
      role="dialog"
      aria-label="Notifikasi tagihan"
    >
      {/* Panel */}
      <div
        className="relative w-full sm:max-w-sm max-h-[calc(100dvh-1.5rem)] min-h-0 flex flex-col
          bg-gradient-to-br from-zinc-950 via-indigo-950/80 to-zinc-900
          rounded-3xl shadow-2xl ring-1 ring-indigo-500/30
          overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative glow */}
        <div aria-hidden="true" className="pointer-events-none absolute -top-16 -right-16 w-40 h-40 rounded-full
          bg-indigo-500/20 blur-3xl" />

        {/* Header */}
        <div className="relative shrink-0 px-5 pt-5 pb-4 border-b border-white/10 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30
              flex items-center justify-center text-xl flex-shrink-0">
              🧾
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-0.5">
                Tagihan Baru
              </p>
              <h2 className="text-base font-extrabold text-white leading-snug">
                Tagihan Bulan {inv.month_year}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Tutup notifikasi tagihan"
            className="flex-shrink-0 w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20
              flex items-center justify-center text-white/60 hover:text-white
              transition-colors font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-4">

          {/* Amount hero */}
          <div className="text-center">
            <p className="text-3xl font-black tabular-nums text-white">
              {fmtRp(inv.total_amount)}
            </p>
            <p className="text-xs text-indigo-300 mt-1">
              {inv.attended_meetings} sesi hadir × {fmtRp(inv.price_per_meeting)}
            </p>
          </div>

          {/* Breakdown */}
          <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3.5 space-y-2.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">
              Rincian
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-zinc-300">
                <span className="w-5 h-5 rounded-full bg-emerald-500/[0.15] text-emerald-400
                  flex items-center justify-center text-[10px]">✓</span>
                Hadir ({inv.attended_meetings} sesi)
              </span>
              <span className="font-bold text-emerald-400 tabular-nums">
                {fmtRp(inv.attended_meetings * inv.price_per_meeting)}
              </span>
            </div>
            {skipped > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-zinc-500">
                  <span className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700
                    flex items-center justify-center text-[10px] text-zinc-500">–</span>
                  Absen ({skipped} sesi)
                </span>
                <span className="font-bold text-zinc-500 tabular-nums">Rp 0</span>
              </div>
            )}
            <div className="border-t border-white/[0.08] pt-2.5 flex items-center justify-between">
              <span className="text-sm font-black text-white">Total</span>
              <span className="text-lg font-black text-white tabular-nums">{fmtRp(inv.total_amount)}</span>
            </div>
          </div>

          {/* Bank account */}
          {inv.bank_account && (
            <div className="rounded-2xl bg-indigo-900/30 border border-indigo-500/25 px-4 py-3.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1.5">
                Transfer ke Rekening
              </p>
              <p className="text-sm font-bold text-indigo-200 font-mono break-all">
                {inv.bank_account}
              </p>
              <p className="text-[11px] text-indigo-400 mt-1.5 leading-relaxed">
                Model pembayaran kami adalah <strong>post-paid</strong> — bayar setelah sesi, konfirmasi ke admin.
              </p>
            </div>
          )}

          {unpaid.length > 1 && (
            <p className="text-[11px] text-zinc-500 text-center">
              +{unpaid.length - 1} tagihan lainnya belum dibayar.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 pb-5 flex items-center gap-3 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={dismiss}
            className="flex-1 py-2.5 rounded-2xl text-sm font-bold
              bg-white/10 hover:bg-white/[0.15] text-white border border-white/10
              transition-colors"
          >
            Tutup
          </button>
          <a
            href="/student/parent-hub"
            onClick={dismiss}
            className="flex-1 inline-flex items-center justify-center gap-2
              py-2.5 rounded-2xl text-sm font-extrabold text-black
              bg-gradient-to-r from-amber-400 to-orange-500
              shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40
              hover:-translate-y-0.5 active:scale-95 transition-all duration-150"
          >
            <i className="fa-solid fa-file-invoice text-[11px]" />
            Lihat Detail
          </a>
        </div>
      </div>
    </div>
  );
}
