import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicCertificateVerification } from '@/features/certificates/queries';
import { PrintCertificateButton } from '@/features/certificates/components/PrintCertificateButton';
import { CertificateArtwork } from '@/features/certificates/components/CertificateArtwork';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Verifikasi Sertifikat — Bits2Bytes',
  description: 'Verifikasi keaslian sertifikat dan lihat rekam pembelajaran Bits2Bytes.',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function VerifyCertificatePage({ params }: PageProps) {
  const { token } = await params;
  const record = await getPublicCertificateVerification(token);
  if (!record) notFound();

  const verifyUrl = `https://bits2bytes.vercel.app/verify/${record.certificate.verification_token}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&format=svg&margin=4&data=${encodeURIComponent(verifyUrl)}`;
  const issuedAt = formatDate(record.certificate.issued_at);
  const tierLabel = record.certificate.tier === 'excellent'
    ? 'EXCELLENT'
    : record.certificate.tier === 'achievement' ? 'ACHIEVEMENT' : 'COMPLETION';

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6">
      <style>{`
        @page { size: A4 landscape; margin: 0; }
        @media print {
          html, body { width: 297mm; height: 210mm; margin: 0 !important; padding: 0 !important; background: #fff !important; }
          body * { visibility: hidden !important; }
          .certificate-print-area, .certificate-print-area * { visibility: visible !important; }
          .certificate-print-area { position: absolute !important; inset: 0 !important; width: 297mm !important; height: 210mm !important; margin: 0 !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
          .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      <div className="mx-auto max-w-5xl space-y-7">
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-700">Bits2Bytes · Certificate Registry</p>
            <h1 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">Verifikasi Sertifikat</h1>
          </div>
          <PrintCertificateButton label={record.moduleTitle} />
        </div>

        <CertificateArtwork
          studentName={record.studentName}
          moduleTitle={record.moduleTitle}
          score={record.certificate.score}
          tierLabel={tierLabel}
          issuedAt={issuedAt}
          certificateNumber={record.certificate.certificate_number}
          qrUrl={qrUrl}
        />

        <section className="no-print grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-indigo-700">Learning Record</p>
                <h2 className="mt-1 text-lg font-black text-slate-900">Materi yang diselesaikan</h2>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{record.topics.length} materi</span>
            </div>
            {record.topics.length ? (
              <ol className="mt-4 space-y-2">
                {record.topics.map((topic, index) => (
                  <li key={topic.id} className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-black text-emerald-700">{index + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800">{topic.title}</p>
                      {topic.completed_at ? <p className="text-[10px] text-slate-500">Diselesaikan {formatDate(topic.completed_at)}</p> : <p className="text-[10px] text-emerald-700">Materi yang dikonfirmasi admin</p>}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Belum ada penyelesaian materi yang tercatat untuk modul ini.</p>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-amber-700">Achievement Collection</p>
              <h2 className="mt-1 text-lg font-black text-slate-900">Badge yang telah terbuka</h2>
              <p className="mt-1 text-xs text-slate-500">Berdasarkan pencapaian profil siswa di Bits2Bytes.</p>
            </div>
            {record.badges.length ? (
              <ul className="mt-4 space-y-2">
                {record.badges.map((badge) => (
                  <li key={badge.id} className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/70 p-3">
                    <span className="text-2xl" aria-hidden="true">{badge.icon}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-slate-900">{badge.title}</p>
                      <p className="text-[10px] leading-relaxed text-slate-600">{badge.description}</p>
                    </div>
                    <span className="ml-auto text-[9px] font-black uppercase text-emerald-700">Terbuka</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Belum ada badge yang terbuka.</p>
            )}
            <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
              <p className="text-xs font-black text-emerald-800">✓ Sertifikat terverifikasi</p>
              <p className="mt-1 break-all font-mono text-[10px] text-emerald-700">ID: {record.certificate.certificate_number}</p>
              <p className="mt-1 text-[10px] text-emerald-700">Diterbitkan {issuedAt} · {record.certificateCount} sertifikat milik siswa</p>
            </div>
          </div>
        </section>

        <p className="no-print text-center text-[11px] text-slate-500">
          Untuk menyimpan sertifikat sebagai PDF, pilih tombol Unduh Sertifikat PDF lalu pilih “Save as PDF” pada dialog cetak browser.
        </p>
      </div>
    </main>
  );
}
