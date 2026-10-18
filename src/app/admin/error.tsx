'use client';
import { useEffect } from 'react';
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[AdminError]', error); }, [error]);
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 text-2xl border border-red-500/20">!</div>
      <div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">Terjadi Kesalahan</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Maaf, terjadi kendala saat memproses halaman ini.</p>
        {error.digest && <p className="text-[10px] text-slate-400 font-mono mt-2">ID: {error.digest}</p>}
        {/* Show actual error message so we can diagnose — remove after fix */}
        <p className="text-[11px] text-red-400 font-mono mt-2 max-w-lg break-all">
          {error.message}
        </p>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={reset} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors">Coba Lagi</button>
        <a href="/admin/dashboard" className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-sm font-bold hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors text-slate-700 dark:text-slate-300">Dasbor</a>
      </div>
    </div>
  );
}
