import type { Metadata } from 'next';
import Image from 'next/image';
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

        <section className="certificate-print-area relative mx-auto aspect-[1.414/1] w-full max-w-[1120px] overflow-hidden rounded-[22px] border border-indigo-200 bg-[#fbfcff] shadow-2xl">
          <div className="absolute inset-[10px] rounded-[15px] border border-indigo-100 sm:inset-[14px]" />
          <div className="absolute -right-20 top-24 h-72 w-72 rounded-full border-[34px] border-[#7cc62f]/[0.08]" />
          <div className="absolute -bottom-36 -left-24 h-80 w-80 rounded-full border-[42px] border-indigo-500/[0.045]" />

          <header className="relative z-10 flex h-[22%] items-center justify-between gap-3 bg-gradient-to-r from-[#171b4b] via-[#282b70] to-[#3730a3] px-6 sm:px-12">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <Image
                src="/b2bdark.webp"
                alt="Logo Bits2Bytes"
                width={64}
                height={64}
                priority
                className="h-10 w-10 rounded-xl object-contain sm:h-14 sm:w-14"
              />
              <div className="min-w-0">
                <div className="whitespace-nowrap text-lg font-black leading-none tracking-[-0.045em] sm:text-[27px]">
                  <span className="text-white">bits</span><span className="text-[#7cc62f]">2</span><span className="text-white">bytes</span>
                </div>
                <p className="mt-1 text-[6px] font-bold uppercase tracking-[0.2em] text-indigo-100 sm:text-[9px] sm:tracking-[0.28em]">Learn · Build · Create</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[7px] font-bold uppercase tracking-[0.22em] text-indigo-200 sm:text-[10px] sm:tracking-[0.3em]">Bits2Bytes Learning Program</p>
              <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-white sm:text-sm sm:tracking-[0.2em]">Certificate of Achievement</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-[4px] bg-[#7cc62f]" />
          </header>

          <div className="relative z-10 flex h-[78%] flex-col px-6 pb-5 pt-4 sm:px-12 sm:pb-8 sm:pt-6">
            <div className="text-center">
              <p className="text-[7px] font-extrabold uppercase tracking-[0.34em] text-[#5fa31f] sm:text-[10px] sm:tracking-[0.42em]">Sertifikat Penyelesaian</p>
              <h2 className="mt-1 font-black leading-none tracking-[-0.055em] text-[#20245c] text-[clamp(24px,4vw,48px)]">SERTIFIKAT</h2>
              <p className="mt-2 text-[7px] font-semibold uppercase tracking-[0.2em] text-slate-500 sm:mt-3 sm:text-[10px] sm:tracking-[0.3em]">Dengan bangga diberikan kepada</p>
              <p className="mx-auto mt-1.5 max-w-[78%] truncate border-b-2 border-[#7cc62f] pb-2 text-[clamp(17px,2.6vw,32px)] font-extrabold tracking-tight text-[#20245c] sm:mt-3 sm:pb-3">
                {record.studentName}
              </p>
              <p className="mt-2 text-[7px] leading-relaxed text-slate-600 sm:mt-3 sm:text-[11px]">
                Atas keberhasilan menyelesaikan pembelajaran pada program
              </p>
              <p className="mt-1 text-[clamp(12px,1.8vw,22px)] font-extrabold tracking-tight text-[#3730a3]">
                {record.moduleTitle}
              </p>
            </div>

            <div className="mt-auto grid grid-cols-[1fr_auto_1fr] items-end gap-3 sm:gap-6">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-[#7cc62f]/35 bg-[#7cc62f]/[0.09] px-2.5 py-1 sm:px-3.5 sm:py-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#7cc62f]" />
                  <span className="text-[6px] font-black uppercase tracking-[0.12em] text-[#477d18] sm:text-[8px]">{tierLabel}</span>
                </div>
                <p className="mt-1.5 text-[6px] font-bold uppercase tracking-[0.16em] text-slate-500 sm:mt-2 sm:text-[8px]">Nilai akhir</p>
                <p className="text-lg font-black leading-none tracking-tight text-[#20245c] sm:text-2xl">
                  {record.certificate.score}<span className="ml-1 text-[8px] font-bold text-slate-400 sm:text-[10px]">/ 100</span>
                </p>
              </div>

              <div className="hidden text-center sm:block">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#7cc62f]/60 text-lg font-black text-[#5fa31f]">2</div>
                <p className="mt-1 text-[8px] font-extrabold tracking-tight text-[#20245c]">BITS2BYTES</p>
                <p className="text-[7px] font-medium text-slate-400">Learning · Growing · Creating</p>
              </div>

              <div className="flex items-end justify-end gap-2 sm:gap-3">
                <div className="min-w-0 text-right">
                  <p className="text-[6px] font-bold uppercase tracking-[0.13em] text-slate-500 sm:text-[8px] sm:tracking-[0.18em]">Tanggal diterbitkan</p>
                  <p className="mt-1 whitespace-nowrap text-[7px] font-bold text-[#20245c] sm:text-[10px]">{issuedAt}</p>
                  <p className="mt-1 max-w-[110px] truncate font-mono text-[5px] text-slate-400 sm:max-w-none sm:text-[7px]">{record.certificate.certificate_number}</p>
                </div>
                <div className="shrink-0 rounded-lg border border-indigo-100 bg-white p-1 shadow-sm sm:rounded-xl sm:p-1.5">
                  {/* QR is generated from the unique public verification URL. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrUrl} alt="QR Code verifikasi sertifikat" width={88} height={88} className="h-10 w-10 sm:h-[68px] sm:w-[68px]" />
                </div>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-indigo-100 pt-1.5 sm:mt-3 sm:pt-2">
              <p className="text-[5px] font-semibold uppercase tracking-[0.12em] text-slate-400 sm:text-[7px] sm:tracking-[0.2em]">Bits2Bytes · Coding Education</p>
              <p className="text-[5px] font-bold uppercase tracking-[0.12em] text-[#5fa31f] sm:text-[7px] sm:tracking-[0.2em]">Scan QR untuk verifikasi keaslian</p>
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
