'use client';
import { Download } from 'lucide-react';

interface PrintCertificateButtonProps {
  label: string;
}

export function PrintCertificateButton({ label }: PrintCertificateButtonProps) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      aria-label={`Unduh sertifikat ${label}`}
      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
        text-xs font-extrabold text-white
        bg-gradient-to-r from-purple-600 to-indigo-600
        shadow-lg shadow-purple-500/20 hover:shadow-xl hover:scale-[1.02]
        active:scale-95 transition-all duration-150"
    >
      <Download className="w-3.5 h-3.5" /> Unduh Sertifikat PDF
    </button>
  );
}
