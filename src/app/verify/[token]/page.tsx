import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicCertificateVerification } from '@/features/certificates/queries';
import { PrintCertificateButton } from '@/features/certificates/components/PrintCertificateButton';

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

        <section className="certificate-print-area relative mx-auto aspect-[1.414/1] w-full max-w-[1120px] overflow-hidden border-[10px] border-[#c6a45c] bg-[#fbf8ef] p-3 shadow-2xl sm:border-[14px] sm:p-5">
          <div className="relative flex h-full flex-col items-center justify-between overflow-hidden border border-[#c6a45c]/70 px-5 py-5 text-center sm:px-12 sm:py-8">
            <div className="pointer-events-none absolute inset-2 border border-[#c6a45c]/35" />
            <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full border-[24px] border-[#17304f]/[0.04]" />
            <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full border-[30px] border-[#c6a45c]/10" />

            <div className="relative z-10 flex w-full items-center justify-between gap-4">
              <div className="text-left">
                <p className="font-serif text-lg font-black tracking-[0.16em] text-[#17304f] sm:text-2xl">BITS2BYTES</p>
                <p className="mt-0.5 text-[7px] font-bold tracking-[0.28em] text-[#8b7444] sm:text-[9px]">LEARN · BUILD · CREATE</p>
              </div>
              <div className="rounded-full border border-[#c6a45c] px-3 py-1 text-[7px] font-black tracking-[0.18em] text-[#8b7444] sm:px-5 sm:py-2 sm:text-[9px]">
                CERTIFICATE OF COMPLETION
              </div>
            </div>

            <div className="relative z-10 max-w-3xl">
              <p className="font-serif text-[9px] font-bold uppercase tracking-[0.34em] text-[#9a7a3c] sm:text-xs">Sertifikat Penyelesaian Program</p>
              <h2 className="mt-2 font-serif text-xl font-bold tracking-wide text-[#17304f] sm:mt-3 sm:text-4xl md:text-5xl">SERTIFIKAT</h2>
              <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.32em] text-[#8b7444] sm:text-[11px]">Diberikan dengan bangga kepada</p>
              <p className="mt-2 border-b border-[#c6a45c] pb-2 font-serif text-lg font-bold text-[#17304f] sm:mt-4 sm:pb-3 sm:text-3xl md:text-4xl">
                {record.studentName}
              </p>
              <p className="mx-auto mt-2 max-w-2xl text-[8px] leading-relaxed text-[#536174] sm:mt-4 sm:text-sm">
                Atas pencapaian dan penyelesaian pembelajaran pada program
              </p>
              <p className="mt-1 font-serif text-sm font-bold text-[#17304f] sm:mt-2 sm:text-2xl md:text-3xl">
                {record.moduleTitle}
              </p>
            </div>

            <div className="relative z-10 flex w-full items-end justify-between gap-3 text-left">
              <div className="space-y-1 sm:space-y-2">
                <p className="text-[7px] font-bold uppercase tracking-[0.16em] text-[#8b7444] sm:text-[9px]">Nilai akhir</p>
                <p className="font-serif text-lg font-bold text-[#17304f] sm:text-2xl">{record.certificate.score}<span className="ml-1 text-[9px] font-sans font-semibold text-[#8b7444] sm:text-xs">/ 100</span></p>
                <p className="text-[7px] font-bold tracking-[0.14em] text-[#8b7444] sm:text-[9px]">{tierLabel}</p>
              </div>

              <div className="hidden text-center sm:block">
                <div className="mx-auto mb-1 h-8 w-8 rounded-full border border-[#c6a45c] text-base leading-8 text-[#9a7a3c]">✦</div>
                <p className="font-serif text-[10px] font-bold text-[#17304f]">Bits2Bytes Academy</p>
                <p className="text-[8px] text-[#8b7444]">Learning Achievement</p>
              </div>

              <div className="flex items-end gap-2 sm:gap-4">
                <div className="text-right">
                  <p className="text-[7px] font-bold uppercase tracking-[0.16em] text-[#8b7444] sm:text-[9px]">Tanggal terbit</p>
                  <p className="mt-1 text-[8px] font-semibold text-[#17304f] sm:text-xs">{issuedAt}</p>
                  <p className="mt-2 text-[6px] font-mono text-[#8b7444] sm:text-[8px]">{record.certificate.certificate_number}</p>
                </div>
                <div className="rounded-md border border-[#c6a45c]/70 bg-white p-1">
                  {/* QR is a generated SVG from the verification URL; skip Next image optimization. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrUrl} alt="QR Code verifikasi sertifikat" width={76} height={76} className="h-12 w-12 sm:h-[76px] sm:w-[76px]" />
                </div>
              </div>
            </div>

            <div className="absolute bottom-1 left-0 right-0 z-10 text-center text-[6px] tracking-[0.12em] text-[#9a7a3c] sm:bottom-2 sm:text-[8px]">
              SCAN QR CODE UNTUK MEMERIKSA KEASLIAN SERTIFIKAT
            </div>
          </div>
        </section>

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
                      <p className="text-[10px] text-slate-500">Diselesaikan {formatDate(topic.completed_at)}</p>
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
