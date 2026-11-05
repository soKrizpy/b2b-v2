'use client';
// src/features/invoices/components/InvoiceBanner.tsx
// Floating invoice notification banner shown on the student dashboard.
// Behaviour mirrors bits2bytes-lms:
//   • sent  → blue gradient, collapsible, shows amount + bank account
//   • paid  → green "Terima Kasih!", auto-dismisses after 5 s, persisted to localStorage
// Rendered once per invoice (multiple sent/paid invoices → multiple banners stacked).

import { useState, useEffect } from 'react';
import { CheckCircle2, Receipt, ChevronUp, ChevronDown } from 'lucide-react';
import type { InvoiceRow } from '@/types/database';

interface Props {
  invoice: InvoiceRow;
}

function fmt(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(n);
}

export function InvoiceBanner({ invoice }: Props) {
  const [visible,     setVisible]     = useState(true);
  const [collapsed,   setCollapsed]   = useState(false);
  const isPaid = invoice.status === 'paid';

  // Paid banner: dismiss after 5 s and remember in localStorage
  useEffect(() => {
    if (!isPaid) return;
    const key = `invoice_dismissed_${invoice.id}`;
    if (localStorage.getItem(key)) { setVisible(false); return; }
    const t = setTimeout(() => {
      setVisible(false);
      localStorage.setItem(key, '1');
    }, 5000);
    return () => clearTimeout(t);
  }, [isPaid, invoice.id]);

  if (!visible) return null;

  // ── Paid state ────────────────────────────────────────────────────────────
  if (isPaid) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl
        bg-emerald-600 text-white shadow-xl shadow-emerald-500/20
        dark:shadow-emerald-900/50 animate-fade-in-up border border-emerald-400/40">
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-5 h-5 text-white" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-extrabold text-sm text-white drop-shadow-sm">Terima Kasih!</p>
          <p className="text-xs text-white/90 font-medium mt-0.5">
            Tagihan bulan {invoice.month_year} sudah dibayar lunas.
          </p>
        </div>
      </div>
    );
  }

  // ── Collapsed (sent, minimised) ───────────────────────────────────────────
  if (collapsed) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl
        bg-gradient-to-r from-blue-600 to-indigo-600 text-white
        shadow-xl shadow-blue-500/20 dark:shadow-blue-900/50 animate-fade-in-up border border-blue-400/30">
        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <Receipt className="w-4 h-4 text-white" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">
            Tagihan {invoice.month_year}: {fmt(invoice.total_amount)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Buka detail"
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white"
          aria-label="Buka detail tagihan"
        >
          <ChevronUp className="w-4 h-4 text-white" aria-hidden="true" />
        </button>
      </div>
    );
  }

  // ── Expanded (sent) ───────────────────────────────────────────────────────
  return (
    <div className="flex items-start gap-4 px-4 py-4 rounded-2xl
      bg-gradient-to-r from-blue-600 to-indigo-600 text-white
      shadow-xl shadow-blue-500/20 dark:shadow-blue-900/50 animate-fade-in-up border border-blue-400/30">
      <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Receipt className="w-4 h-4 text-white" aria-hidden="true" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-extrabold text-sm text-white drop-shadow-sm">Tagihan Bulan {invoice.month_year}</p>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            title="Ciutkan"
            className="flex-shrink-0 p-1 -mt-0.5 -mr-0.5 rounded-lg
              hover:bg-white/20 transition-colors text-white"
            aria-label="Ciutkan tagihan"
          >
            <ChevronDown className="w-4 h-4 text-white" aria-hidden="true" />
          </button>
        </div>

        <p className="text-xs text-white/90 font-semibold mt-1">
          {invoice.attended_meetings} Kehadiran × {fmt(invoice.price_per_meeting)}
        </p>
        <p className="text-xl font-extrabold text-white tabular-nums mt-1.5 drop-shadow-sm">
          {fmt(invoice.total_amount)}
        </p>

        {invoice.bank_account && (
          <div className="mt-3 pt-3 border-t border-white/30">
            <p className="text-[11px] text-white/90 mb-1 uppercase tracking-wider font-bold drop-shadow-sm">
              Transfer ke rekening:
            </p>
            <p className="text-sm font-extrabold tracking-wider bg-black/40 text-white border border-white/20 px-3.5 py-2.5 rounded-xl text-center break-all shadow-inner font-mono select-all">
              {invoice.bank_account}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Container — renders all banners ──────────────────────────────────────────

export function InvoiceBanners({ invoices }: { invoices: InvoiceRow[] }) {
  if (invoices.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      {invoices.map((inv) => (
        <InvoiceBanner key={inv.id} invoice={inv} />
      ))}
    </div>
  );
}
