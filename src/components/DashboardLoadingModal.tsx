'use client';

type DashboardLoadingModalProps = {
  role: 'admin' | 'teacher';
};

/**
 * Shared full-viewport loading fallback used by the Admin and Teacher route segments.
 * Route-level loading.tsx boundaries show it while the next page is streaming.
 */
export function DashboardLoadingModal({ role }: DashboardLoadingModalProps) {
  const roleLabel = role === 'admin' ? 'Admin' : 'Guru';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Memuat dashboard ${roleLabel}`}
      className="fixed inset-0 z-[200] grid min-h-dvh place-items-center bg-slate-950/65 p-4 backdrop-blur-sm"
    >
      <div className="flex w-full max-w-xs items-center gap-4 rounded-2xl border border-blue-200/80 dark:border-purple-500/40 bg-white dark:bg-[#0B0F19] px-5 py-4 text-slate-900 dark:text-white shadow-2xl shadow-slate-950/20 dark:shadow-purple-950/30">
        <span
          className="h-9 w-9 shrink-0 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600 dark:border-white/[0.10] dark:border-t-purple-400"
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-bold">Memuat halaman…</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Menyiapkan dashboard {roleLabel.toLowerCase()}.
          </p>
        </div>
      </div>
    </div>
  );
}
