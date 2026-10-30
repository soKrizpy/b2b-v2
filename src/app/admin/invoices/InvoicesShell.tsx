'use client';
// src/app/admin/invoices/InvoicesShell.tsx
// Refactored Admin Invoice Management:
//   1. Top Dashboard Financial Overview Cards (Total, Paid, Sent, Draft)
//   2. Real-time Search & Status Filter & Bulk Row Selection
//   3. Responsive Mobile Card View (<768px) + Desktop Table
//   4. Multi-channel Send Invoice Workflow & Modal (WhatsApp / Email / Direct)
//   5. Attendance Detail & Edit Invoice Modals + Parent Link Copy Popup

import { useState, useActionState, useEffect, useCallback, useTransition, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  FileText,
  Send,
  Eye,
  Edit2,
  Link as LinkIcon,
  MessageSquare,
  Mail,
  Sparkles,
  CheckSquare,
  Square,
  TrendingUp,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import {
  generateInvoices,
  updateInvoice,
  createParentLink,
  bulkUpdateInvoiceStatus,
  type InvoiceActionResult,
} from '@/features/invoices/actions';
import { getAttendanceForInvoice, type InvoiceWithStudent, type AttendanceDetail } from '@/features/invoices/queries';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function cleanPhoneForWa(phone: string | null): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  return cleaned;
}

const STATUS_CFG = {
  draft: {
    label: 'Draft',
    badge: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20',
    dot: 'bg-slate-400',
  },
  sent:  {
    label: 'Terkirim',
    badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25',
    dot: 'bg-amber-500',
  },
  paid:  {
    label: 'Lunas',
    badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25',
    dot: 'bg-emerald-500',
  },
} as const;

// ── Financial Metric Card Component ──────────────────────────────────────────

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  color: 'indigo' | 'emerald' | 'amber' | 'slate';
}) {
  const colorMap = {
    indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    slate: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  };

  return (
    <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border-2 border-blue-400/45 dark:border-purple-500/45
      p-4 flex flex-col justify-between gap-3 shadow-sm hover:shadow-neon-blue dark:hover:shadow-neon-purple
      dark:shadow-[0_0_22px_rgba(168,85,247,0.18)] dark:ring-1 dark:ring-purple-500/25
      hover:border-blue-500 dark:hover:border-purple-400 hover:scale-[1.02] hover:-translate-y-0.5
      transition-all duration-300 ease-out">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          {title}
        </span>
        <div className={`p-2 rounded-xl border ${colorMap[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-purple-50 tracking-tight tabular-nums">
          {value}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

// ── Send Invoice Modal ────────────────────────────────────────────────────────

function SendInvoiceModal({
  invoices,
  onClose,
  onSuccess,
}: {
  invoices: InvoiceWithStudent[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [channel, setChannel] = useState<'whatsapp' | 'email' | 'direct'>('whatsapp');
  const [pending, setPending] = useState(false);
  const [customNote, setCustomNote] = useState('');

  const singleInv = invoices.length === 1 ? invoices[0] : null;

  // Generate WA Message preview
  const waMessage = useMemo(() => {
    if (!singleInv) return '';
    const name = singleInv.student_full_name;
    const month = singleInv.month_year;
    const attended = singleInv.attended_meetings;
    const total = singleInv.total_meetings;
    const amount = fmt(singleInv.total_amount);
    const bank = singleInv.bank_account || 'Hubungi Admin';

    return `Halo Bpk/Ibu Orang Tua dari *${name}*,\n\nBerikut rincian tagihan bimbingan belajar Bits2Bytes untuk periode *${month}*:\n\n• Kehadiran: ${attended} / ${total} Pertemuan\n• Total Tagihan: *${amount}*\n• Rekening Pembayaran: ${bank}\n${customNote ? `\nCatatan: ${customNote}\n` : ''}\nMohon lakukan konfirmasi setelah pembayaran. Terima kasih! 🙏`;
  }, [singleInv, customNote]);

  const handleConfirmSend = async () => {
    setPending(true);
    try {
      const ids = invoices.map((inv) => inv.id);
      const res = await bulkUpdateInvoiceStatus(ids, 'sent');
      if (res.success) {
        if (channel === 'whatsapp' && singleInv) {
          const waPhone = cleanPhoneForWa(singleInv.student_email_or_phone);
          if (waPhone) {
            const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(waMessage)}`;
            window.open(waUrl, '_blank');
          }
        }
        onSuccess();
        onClose();
      } else {
        alert(res.error);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal mengirim invoice');
    } finally {
      setPending(false);
    }
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal((
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/60
        backdrop-blur-sm p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="my-auto w-full max-w-lg shrink-0 bg-white dark:bg-[#0B0F19] rounded-3xl
          shadow-2xl border-2 border-blue-400/50 dark:border-purple-500/40
          dark:shadow-[0_0_35px_rgba(168,85,247,0.22)] dark:ring-1 dark:ring-purple-500/35 overflow-hidden flex flex-col min-h-0 max-h-[calc(100dvh-1.5rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="shrink-0 px-6 py-4 border-b border-slate-200/60 dark:border-purple-500/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                Kirim Invoice Tagihan
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {invoices.length === 1
                  ? `${singleInv?.student_full_name} (${singleInv?.month_year})`
                  : `${invoices.length} invoice dipilih untuk dikirim`
                }
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-purple-950/40 flex items-center justify-center
              text-slate-500 dark:text-purple-300 hover:bg-slate-200 dark:hover:bg-purple-900/50 transition-colors font-bold"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 flex flex-col gap-4">
          {/* Channel selector */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
              Pilih Kanal Pengiriman
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setChannel('whatsapp')}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition-all
                  ${channel === 'whatsapp'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
              >
                <MessageSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => setChannel('email')}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition-all
                  ${channel === 'email'
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
              >
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Email</span>
              </button>
              <button
                type="button"
                onClick={() => setChannel('direct')}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition-all
                  ${channel === 'direct'
                    ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
              >
                <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>Langsung</span>
              </button>
            </div>
          </div>

          {/* WhatsApp Preview */}
          {channel === 'whatsapp' && singleInv && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Pratinjau Pesan WhatsApp
              </label>
              <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40
                rounded-2xl p-3.5 text-xs text-slate-800 dark:text-slate-200 font-sans whitespace-pre-wrap leading-relaxed">
                {waMessage}
              </div>
              <input
                type="text"
                placeholder="Tambahkan catatan khusus (opsional)..."
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#020617]
                  border border-slate-200 dark:border-purple-500/30 text-slate-900 dark:text-white
                  placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
          )}

          {/* Target List Summary */}
          <div className="bg-slate-50 dark:bg-[#020617] border-2 border-slate-200/80 dark:border-purple-500/30 rounded-2xl p-3.5">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Ringkasan Penerima ({invoices.length}):
            </p>
            <div className="max-h-36 overflow-y-auto flex flex-col gap-2 pr-1">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-200/40 dark:border-white/5 last:border-0">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white truncate">{inv.student_full_name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{inv.student_email_or_phone}</p>
                  </div>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums flex-shrink-0 ml-2">
                    {fmt(inv.total_amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200/60 dark:border-purple-500/20 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300
              hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={handleConfirmSend}
            className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white
              bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
          >
            {pending ? 'Memproses...' : (
              <>
                <Send className="w-4 h-4" />
                <span>{channel === 'whatsapp' ? 'Kirim via WA & Tandai Terkirim' : 'Konfirmasi & Tandai Terkirim'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  ), document.body);
}

// ── Attendance Detail Modal ───────────────────────────────────────────────────

function AttendanceModal({
  invoice,
  onClose,
}: {
  invoice: InvoiceWithStudent;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<AttendanceDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAttendanceForInvoice(invoice.id)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [invoice.id]);

  const attended = rows.filter((r) => r.has_joined).length;

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal((
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/60
        backdrop-blur-sm p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="my-auto w-full max-w-lg shrink-0 min-h-0 max-h-[calc(100dvh-1.5rem)] flex flex-col bg-white dark:bg-[#0B0F19] rounded-3xl
          shadow-2xl border-2 border-blue-400/50 dark:border-purple-500/40
          dark:shadow-[0_0_35px_rgba(168,85,247,0.22)] dark:ring-1 dark:ring-purple-500/35 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-6 pt-6 pb-4 border-b border-slate-200/60 dark:border-purple-500/20 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">
              Detail Kehadiran
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {invoice.student_full_name} · {invoice.month_year}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-purple-950/40 flex items-center justify-center
              text-slate-500 dark:text-purple-300 hover:bg-slate-200 dark:hover:bg-purple-900/50 transition-colors font-bold"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
          {loading ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">Memuat detail kehadiran…</p>
          ) : rows.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">
              Tidak ada pertemuan ditemukan untuk bulan ini.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {rows.map((r, i) => (
                <li
                  key={r.meeting_id}
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl
                    bg-slate-50 dark:bg-[#020617] border border-slate-200/60 dark:border-purple-500/25"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                      {i + 1}. {r.title}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {r.meeting_date ? formatDate(r.meeting_date) : '—'}
                    </p>
                  </div>
                  <span
                    className={`flex-shrink-0 text-[10px] font-bold px-2.5 py-0.5 rounded-full border
                      ${r.has_joined
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700/40'
                        : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700/40'
                      }`}
                  >
                    {r.has_joined ? '✓ Hadir' : '✗ Absen'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="shrink-0 px-6 py-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            Total Hadir:
            <span className="ml-2 text-[#7cc62f]">{attended} / {rows.length} Pertemuan</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-white/15
              text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  ), document.body);
}

// ── Edit Invoice Modal ────────────────────────────────────────────────────────

function EditModal({
  invoice,
  onClose,
}: {
  invoice: InvoiceWithStudent;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, dispatch, pending] = useActionState<InvoiceActionResult | null, FormData>(
    updateInvoice,
    null,
  );

  const [price, setPrice] = useState(String(invoice.price_per_meeting));
  const [attended, setAttended] = useState(String(invoice.attended_meetings));
  const [bank, setBank] = useState(invoice.bank_account ?? '');

  useEffect(() => {
    if (state?.success) {
      onClose();
      router.refresh();
    }
  }, [state, onClose, router]);

  const numPrice = Math.max(0, parseInt(price) || 0);
  const numAttended = Math.max(0, Math.min(parseInt(attended) || 0, invoice.total_meetings));
  const total = numAttended * numPrice;

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal((
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/60
        backdrop-blur-sm p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="my-auto w-full max-w-md shrink-0 min-h-0 max-h-[calc(100dvh-1.5rem)] flex flex-col bg-white dark:bg-[#0B0F19] rounded-3xl
          shadow-2xl border-2 border-blue-400/50 dark:border-purple-500/40
          dark:shadow-[0_0_35px_rgba(168,85,247,0.22)] dark:ring-1 dark:ring-purple-500/35 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-6 pt-6 pb-4 border-b border-slate-200/60 dark:border-purple-500/20 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
              Edit Detail Invoice
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {invoice.student_full_name} · {invoice.month_year}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-purple-950/40 flex items-center justify-center
              text-slate-500 dark:text-purple-300 hover:bg-slate-200 dark:hover:bg-purple-900/50 transition-colors font-bold"
          >
            ✕
          </button>
        </div>

        <form action={dispatch} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 flex flex-col gap-4">
          <input type="hidden" name="id" value={invoice.id} />
          <input type="hidden" name="status" value={invoice.status} />
          <input type="hidden" name="total_meetings" value={invoice.total_meetings} />

          {state && !state.success && (
            <p role="alert" className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20
              rounded-xl px-3 py-2 border border-red-200 dark:border-red-700/40">
              {state.error}
            </p>
          )}

          <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-white/10 pb-3">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Total Pertemuan Kontak</span>
            <span className="font-bold text-slate-800 dark:text-white">{invoice.total_meetings}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Kehadiran Dihitung (maks. {invoice.total_meetings})
            </label>
            <input
              type="number"
              name="attended_meetings"
              min={0}
              max={invoice.total_meetings}
              value={attended}
              onChange={(e) => setAttended(e.target.value)}
              className="rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2
                text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100
                focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Harga per Pertemuan (Rp)
            </label>
            <input
              type="number"
              name="price_per_meeting"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="rounded-xl border border-slate-300 dark:border-purple-500/30 px-3.5 py-2
                text-xs bg-white dark:bg-[#020617] text-slate-900 dark:text-white
                focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Nomor Rekening Pembayaran
            </label>
            <input
              type="text"
              name="bank_account"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              placeholder="BCA 1234567890 a.n. Bits2Bytes"
              className="rounded-xl border border-slate-300 dark:border-purple-500/30 px-3.5 py-2
                text-xs bg-white dark:bg-[#020617] text-slate-900 dark:text-white
                focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/10">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Total Tagihan Baru</span>
            <span className="text-lg font-black text-[#7cc62f] tabular-nums">
              {fmt(total)}
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-white/15
                text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={pending}
              className="px-5 py-2 rounded-xl text-xs font-extrabold text-white
                bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm active:scale-95"
            >
              {pending ? 'Menyimpan…' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  ), document.body);
}

// ── Parent Link Popup ─────────────────────────────────────────────────────────

function ParentLinkPopup({ url, onClose }: { url: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal((
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/60
        backdrop-blur-sm p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="my-auto w-full max-w-md shrink-0 max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain bg-white dark:bg-[#0B0F19] rounded-3xl
          shadow-2xl border-2 border-blue-400/50 dark:border-purple-500/40
          dark:shadow-[0_0_35px_rgba(168,85,247,0.22)] dark:ring-1 dark:ring-purple-500/35 p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <img
            src="/b2blight.webp"
            alt="Logo resmi Bits2Bytes"
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 object-contain"
          />
          <div className="min-w-0">
            <div className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
              <span>bits</span><span className="text-lime-500 dark:text-lime-400">2</span><span>bytes</span>
            </div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Link Laporan Orang Tua
            </h3>
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Bagikan link ini kepada orang tua siswa. Berisi rincian kehadiran dan tagihan transparan tanpa perlu login.
        </p>
        <div className="flex gap-2">
          <input
            readOnly
            value={url}
            onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
            className="flex-1 min-w-0 px-3.5 py-2 rounded-xl text-xs font-mono
              border border-slate-200 dark:border-white/15
              bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-200
              focus:outline-none truncate"
          />
          <button
            type="button"
            onClick={copy}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-extrabold text-white
              transition-all flex items-center gap-1.5 active:scale-95 ${copied
                ? 'bg-emerald-600'
                : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Disalin' : 'Salin'}</span>
          </button>
        </div>
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-white/15
              text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  ), document.body);
}

// ── Main Shell Component ──────────────────────────────────────────────────────

interface Props {
  invoices: InvoiceWithStudent[];
  selectedMonth: string;
}

export function InvoicesShell({ invoices, selectedMonth }: Props) {
  const router = useRouter();

  const [month, setMonth] = useState(selectedMonth);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'sent' | 'paid'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals state
  const [editInv, setEditInv] = useState<InvoiceWithStudent | null>(null);
  const [attnInv, setAttnInv] = useState<InvoiceWithStudent | null>(null);
  const [popupUrl, setPopupUrl] = useState<string | null>(null);
  const [sendModalInvoices, setSendModalInvoices] = useState<InvoiceWithStudent[] | null>(null);

  // Link cache
  const [linkCache, setLinkCache] = useState<Record<string, string>>({});
  const [linkPending, setLinkPending] = useState<string | null>(null);

  const showReminder = new Date().getDate() <= 7;

  // ── Filtered list ──
  const filteredInvoices = useMemo(() => {
    const q = search.toLowerCase().trim();
    return invoices.filter((inv) => {
      const matchSearch =
        !q ||
        inv.student_full_name.toLowerCase().includes(q) ||
        (inv.student_email_or_phone ?? '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, search, statusFilter]);

  // ── Financial Metrics Calculation ──
  const metrics = useMemo(() => {
    const totalCount = invoices.length;
    const totalValue = invoices.reduce((acc, inv) => acc + inv.total_amount, 0);

    const paidInvoices = invoices.filter((inv) => inv.status === 'paid');
    const paidValue = paidInvoices.reduce((acc, inv) => acc + inv.total_amount, 0);

    const sentInvoices = invoices.filter((inv) => inv.status === 'sent');
    const sentValue = sentInvoices.reduce((acc, inv) => acc + inv.total_amount, 0);

    const draftInvoices = invoices.filter((inv) => inv.status === 'draft');
    const draftValue = draftInvoices.reduce((acc, inv) => acc + inv.total_amount, 0);

    return {
      totalCount,
      totalValue,
      paidCount: paidInvoices.length,
      paidValue,
      sentCount: sentInvoices.length,
      sentValue,
      draftCount: draftInvoices.length,
      draftValue,
      pendingCount: sentInvoices.length + draftInvoices.length,
      pendingValue: sentValue + draftValue,
    };
  }, [invoices]);

  // ── Selection Handlers ──
  const allSelected =
    filteredInvoices.length > 0 &&
    filteredInvoices.every((inv) => selectedIds.has(inv.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInvoices.map((inv) => inv.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // ── Bulk Actions ──
  const selectedInvoices = useMemo(() => {
    return invoices.filter((inv) => selectedIds.has(inv.id));
  }, [invoices, selectedIds]);

  const selectedDrafts = useMemo(() => {
    return selectedInvoices.filter((inv) => inv.status === 'draft');
  }, [selectedInvoices]);

  const handleBulkSendDrafts = () => {
    if (selectedDrafts.length === 0) return;
    setSendModalInvoices(selectedDrafts);
  };

  const [, startTransition] = useTransition();

  const handleBulkMarkPaid = () => {
    if (selectedInvoices.length === 0) return;
    const ids = selectedInvoices.map((i) => i.id);
    startTransition(async () => {
      const res = await bulkUpdateInvoiceStatus(ids, 'paid');
      if (res.success) {
        setSelectedIds(new Set());
        router.refresh();
      } else {
        alert(res.error);
      }
    });
  };

  // ── Single Actions ──
  const handleSingleSend = (inv: InvoiceWithStudent) => {
    setSendModalInvoices([inv]);
  };

  const handleStatusChange = useCallback(
    (inv: InvoiceWithStudent, newStatus: string) => {
      const fd = new FormData();
      fd.append('id', inv.id);
      fd.append('status', newStatus);
      fd.append('price_per_meeting', String(inv.price_per_meeting));
      fd.append('attended_meetings', String(inv.attended_meetings));
      fd.append('total_meetings', String(inv.total_meetings));
      fd.append('bank_account', inv.bank_account ?? '');

      startTransition(async () => {
        await updateInvoice(null, fd);
        router.refresh();
      });
    },
    [router]
  );

  const handleParentLink = useCallback(
    async (inv: InvoiceWithStudent) => {
      if (linkCache[inv.id]) {
        setPopupUrl(linkCache[inv.id]);
        return;
      }
      setLinkPending(inv.id);
      try {
        const fd = new FormData();
        fd.append('student_id', inv.student_id);
        fd.append('invoice_id', inv.id);
        const result = await createParentLink(null, fd);
        if (result.success && result.data?.url) {
          const url = result.data.url as string;
          setLinkCache((prev) => ({ ...prev, [inv.id]: url }));
          setPopupUrl(url);
        } else if (!result.success) {
          alert(result.error);
        }
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Gagal membuat link orang tua. Silakan coba lagi.');
      } finally {
        setLinkPending(null);
      }
    },
    [linkCache]
  );

  // ── Generation Form ──
  const [genState, genDispatch, genPending] = useActionState<InvoiceActionResult | null, FormData>(
    generateInvoices,
    null
  );

  useEffect(() => {
    if (genState?.success) {
      router.push(`/admin/invoices?month=${month}`);
    }
  }, [genState, month, router]);

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMonth(val);
    setSelectedIds(new Set());
    router.push(`/admin/invoices?month=${val}`);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── 1. Financial Summary Overview Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Invoice (Bulan Ini)"
          value={String(metrics.totalCount)}
          subtitle={`Total Tagihan: ${fmt(metrics.totalValue)}`}
          icon={FileText}
          color="indigo"
        />
        <MetricCard
          title="Total Pembayaran Lunas"
          value={fmt(metrics.paidValue)}
          subtitle={`${metrics.paidCount} dari ${metrics.totalCount} invoice lunas`}
          icon={CheckCircle2}
          color="emerald"
        />
        <MetricCard
          title="Invoice Terkirim (Pending)"
          value={fmt(metrics.sentValue)}
          subtitle={`${metrics.sentCount} invoice menunggu pembayaran`}
          icon={Clock}
          color="amber"
        />
        <MetricCard
          title="Draft Tagihan"
          value={fmt(metrics.draftValue)}
          subtitle={`${metrics.draftCount} invoice belum dikirim`}
          icon={TrendingUp}
          color="slate"
        />
      </div>

      {/* ── 2. Toolbar: Month Picker + Generate + Search & Filter ── */}
      <div className="bg-white dark:bg-[#0B0F19] p-4 rounded-2xl border-2 border-blue-400/45 dark:border-purple-500/45 shadow-sm dark:shadow-[0_0_25px_rgba(168,85,247,0.15)] dark:ring-1 dark:ring-purple-500/20 flex flex-col gap-4 transition-all duration-300">
        {/* Top bar: month & generate */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Periode Tagihan:</span>
            <input
              type="month"
              value={month}
              onChange={handleMonthChange}
              className="px-3.5 py-2 rounded-xl border-2 border-slate-200 dark:border-purple-500/30
                text-xs font-bold bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-white
                focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
            />
          </div>

          <form action={genDispatch}>
            <input type="hidden" name="month_year" value={month} />
            <button
              type="submit"
              disabled={genPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold
                text-white bg-[#7cc62f] hover:bg-[#5fa31f] disabled:opacity-50
                transition-all shadow-sm active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>{genPending ? 'Memproses…' : 'Generate Invoice'}</span>
            </button>
          </form>
        </div>

        {/* Search & Status Filter row */}
        <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-slate-100 dark:border-white/5">
          {/* Search input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama siswa atau nomor HP/email…"
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#020617]
                border border-slate-200 dark:border-purple-500/30 text-slate-900 dark:text-white
                placeholder:text-slate-400 dark:placeholder:text-slate-500
                focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'draft' | 'sent' | 'paid')}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-purple-500/30
                text-xs font-bold bg-slate-50 dark:bg-[#020617] text-slate-800 dark:text-slate-200
                focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all cursor-pointer"
            >
              <option value="all">Semua Status ({invoices.length})</option>
              <option value="draft">Draft ({metrics.draftCount})</option>
              <option value="sent">Terkirim ({metrics.sentCount})</option>
              <option value="paid">Lunas ({metrics.paidCount})</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Generate & Reminder Notifications ── */}
      {genState && (
        <div
          className={`rounded-2xl px-4 py-3 text-xs font-bold border ${
            genState.success
              ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40'
              : 'bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800/40'
          }`}
        >
          {genState.success ? `✓ ${genState.message}` : `✗ ${genState.error}`}
        </div>
      )}

      {showReminder && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 px-4 py-3 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
            <strong>Pengingat Awal Bulan:</strong> Mohon generate dan kirim invoice tagihan pertemuan bulan lalu kepada orang tua murid.
          </p>
        </div>
      )}

      {/* ── 3. Bulk Action Bar (Visible when >= 1 item selected) ── */}
      {selectedIds.size > 0 && (
        <div className="bg-indigo-600 text-white p-3.5 rounded-2xl shadow-lg flex items-center justify-between gap-3 flex-wrap animate-fade-in-up">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 px-2.5 py-1 rounded-xl text-xs font-extrabold tabular-nums">
              {selectedIds.size} dipilih
            </span>
            <span className="text-xs font-semibold text-indigo-100 hidden sm:inline">
              Pilih tindakan massal untuk invoice tercentang
            </span>
          </div>
          <div className="flex items-center gap-2">
            {selectedDrafts.length > 0 && (
              <button
                type="button"
                onClick={handleBulkSendDrafts}
                className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-white text-indigo-700 hover:bg-indigo-50 transition-all active:scale-95 shadow-sm flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim {selectedDrafts.length} Draft</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleBulkMarkPaid}
              className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-500 hover:bg-emerald-600 text-white transition-all active:scale-95 shadow-sm flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Tandai Lunas ({selectedIds.size})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-all"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* ── Invoice List: Mobile Cards + Desktop Table ── */}
      {filteredInvoices.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed
          border-blue-400/40 dark:border-purple-500/30 bg-white dark:bg-[#0B0F19] dark:shadow-[0_0_20px_rgba(168,85,247,0.12)] py-16 px-6 text-center">
          <span className="text-4xl" aria-hidden="true">🧾</span>
          <p className="font-bold text-slate-700 dark:text-white text-sm">
            {search || statusFilter !== 'all'
              ? 'Tidak ada invoice yang sesuai dengan filter.'
              : 'Belum ada invoice untuk periode bulan ini.'}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs">
            {search || statusFilter !== 'all'
              ? 'Coba ganti kata kunci pencarian atau ubah filter status.'
              : `Klik "Generate Invoice" di atas untuk membuat tagihan otomatis berdasarkan kehadiran.`}
          </p>
        </div>
      ) : (
        <>
          {/* ── Mobile Layout (<768px): Card View ── */}
          <div className="flex flex-col gap-3 md:hidden">
            {/* Mobile Select All Header */}
            <div className="flex items-center justify-between px-1 py-1">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                {allSelected ? <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> : <Square className="w-4 h-4 text-slate-400" />}
                <span>Pilih Semua ({filteredInvoices.length})</span>
              </button>
              <span className="text-[10px] font-bold uppercase text-slate-400">
                {filteredInvoices.length} Item
              </span>
            </div>

            {/* Mobile Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredInvoices.map((inv) => {
                const scfg = STATUS_CFG[inv.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.draft;
                const isSelected = selectedIds.has(inv.id);

                return (
                  <div
                    key={inv.id}
                    className={`bg-white dark:bg-[#0B0F19] rounded-2xl border-2 p-4 flex flex-col gap-3.5 shadow-sm hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-300 ease-out cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 dark:border-purple-400 ring-2 ring-blue-500/20 dark:ring-purple-500/30 shadow-neon-blue dark:shadow-neon-purple'
                        : 'border-blue-400/45 dark:border-purple-500/45 hover:border-blue-500 dark:hover:border-purple-400 hover:shadow-neon-blue dark:hover:shadow-neon-purple dark:shadow-[0_0_15px_rgba(168,85,247,0.12)]'
                    }`}
                  >
                    {/* Header: Checkbox + Name + Status */}
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => toggleSelect(inv.id)}
                        className="mt-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-slate-900 dark:text-white text-sm truncate leading-snug">
                          {inv.student_full_name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                          {inv.student_email_or_phone || 'Kontak tidak tersedia'}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex-shrink-0 ${scfg.badge}`}>
                        {scfg.label}
                      </span>
                    </div>

                    {/* Body: Attendance & Financial Total */}
                    <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 flex items-center justify-between gap-2 border border-slate-100 dark:border-white/5">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                          Kehadiran
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {inv.attended_meetings} / {inv.total_meetings} Pertemuan
                          </span>
                          <button
                            type="button"
                            onClick={() => setAttnInv(inv)}
                            className="p-1 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                            title="Detail Kehadiran"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                          Total Tagihan
                        </span>
                        <span className="text-sm font-black text-[#7cc62f] tabular-nums block">
                          {fmt(inv.total_amount)}
                        </span>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-white/5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleParentLink(inv)}
                        disabled={linkPending === inv.id}
                        className="flex-1 min-w-[90px] inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold
                          bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200
                          hover:bg-slate-200 dark:hover:bg-white/15 transition-all border border-slate-200/60 dark:border-white/10"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        <span>{linkPending === inv.id ? '⏳' : linkCache[inv.id] ? 'Salin' : 'Link Ortu'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditInv(inv)}
                        className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold
                          bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200
                          hover:bg-slate-200 dark:hover:bg-white/15 transition-all border border-slate-200/60 dark:border-white/10"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      {inv.status === 'draft' && (
                        <button
                          type="button"
                          onClick={() => handleSingleSend(inv)}
                          className="flex-1 min-w-[90px] inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-extrabold
                            bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm active:scale-95"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Kirim</span>
                        </button>
                      )}

                      {inv.status === 'sent' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(inv, 'paid')}
                          className="flex-1 min-w-[90px] inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-extrabold
                            bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm active:scale-95"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Lunas</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Desktop Layout (>=768px): Table View ── */}
          <div className="hidden md:block rounded-2xl overflow-hidden border-2 border-blue-400/45 dark:border-purple-500/45 shadow-sm dark:shadow-[0_0_30px_rgba(168,85,247,0.18)] dark:ring-1 dark:ring-purple-500/25 bg-white dark:bg-[#0B0F19] transition-all duration-300">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-blue-50/60 dark:bg-purple-950/30 border-b border-blue-400/40 dark:border-purple-500/40">
                  <tr>
                    <th className="px-4 py-3.5 text-left w-10">
                      <button type="button" onClick={toggleSelectAll} className="flex items-center">
                        {allSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3.5 text-left font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Siswa
                    </th>
                    <th className="px-4 py-3.5 text-left font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      Kehadiran
                    </th>
                    <th className="px-4 py-3.5 text-left font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      Total Tagihan
                    </th>
                    <th className="px-4 py-3.5 text-left font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-4 py-3.5 text-left font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100 dark:divide-purple-500/20">
                  {filteredInvoices.map((inv) => {
                    const scfg = STATUS_CFG[inv.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.draft;
                    const isSelected = selectedIds.has(inv.id);

                    return (
                      <tr
                        key={inv.id}
                        className={`transition-all duration-200 border-b border-blue-100 dark:border-purple-500/20 ${
                          isSelected
                            ? 'bg-blue-50/80 dark:bg-purple-950/40'
                            : 'bg-white dark:bg-[#0B0F19] hover:bg-blue-50/50 dark:hover:bg-purple-950/30'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="px-4 py-3 w-10">
                          <button
                            type="button"
                            onClick={() => toggleSelect(inv.id)}
                            className="flex items-center text-slate-400 hover:text-indigo-600"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                            )}
                          </button>
                        </td>

                        {/* Student Name & Contact */}
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900 dark:text-white text-xs">
                            {inv.student_full_name}
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                            {inv.student_email_or_phone}
                          </p>
                        </td>

                        {/* Attendance */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {inv.attended_meetings}/{inv.total_meetings}
                            </span>
                            <button
                              type="button"
                              onClick={() => setAttnInv(inv)}
                              title="Lihat detail kehadiran"
                              className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="font-extrabold text-slate-900 dark:text-white tabular-nums">
                            {fmt(inv.total_amount)}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                            {inv.attended_meetings} × {fmt(inv.price_per_meeting)}
                          </p>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${scfg.badge}`}>
                            {scfg.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditInv(inv)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 dark:border-white/15
                                text-slate-600 dark:text-slate-300 hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-400
                                transition-colors bg-white dark:bg-white/5"
                            >
                              Edit
                            </button>

                            {inv.status === 'draft' && (
                              <button
                                type="button"
                                onClick={() => handleSingleSend(inv)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold
                                  bg-blue-600 hover:bg-blue-700 text-white transition-all active:scale-95 shadow-sm"
                              >
                                Kirim
                              </button>
                            )}

                            {inv.status === 'sent' && (
                              <button
                                type="button"
                                onClick={() => handleStatusChange(inv, 'paid')}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold
                                  bg-emerald-600 hover:bg-emerald-700 text-white transition-all active:scale-95 shadow-sm"
                              >
                                Lunas
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleParentLink(inv)}
                              disabled={linkPending === inv.id}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors
                                ${linkCache[inv.id]
                                  ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800/40'
                                  : 'bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/15 hover:border-violet-300 hover:text-violet-600'
                                } disabled:opacity-50`}
                            >
                              {linkPending === inv.id ? '⏳' : linkCache[inv.id] ? '🔗 Salin Link' : '🔗 Link Ortu'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Modals Container ── */}
      {editInv && <EditModal invoice={editInv} onClose={() => setEditInv(null)} />}
      {attnInv && <AttendanceModal invoice={attnInv} onClose={() => setAttnInv(null)} />}
      {popupUrl && <ParentLinkPopup url={popupUrl} onClose={() => setPopupUrl(null)} />}
      {sendModalInvoices && (
        <SendInvoiceModal
          invoices={sendModalInvoices}
          onClose={() => setSendModalInvoices(null)}
          onSuccess={() => {
            setSelectedIds(new Set());
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
