import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { ROLE_DASHBOARD_MAP } from "@/lib/constants";
import { redirect } from "next/navigation";
import { Sparkles, ArrowRight, Code2, Trophy, Compass, ShieldCheck } from "lucide-react";

export default async function RootPage() {
  const auth = await getAuthUser();
  if (auth.ok && auth.role && auth.role in ROLE_DASHBOARD_MAP) {
    redirect(ROLE_DASHBOARD_MAP[auth.role]);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between selection:bg-purple-500 selection:text-white">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <header className="relative z-10 max-w-6xl w-full mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
            <Code2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-white block leading-none">Bits2Bytes</span>
            <span className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase">Coding Academy LMS</span>
          </div>
        </div>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white ring-1 ring-white/15 hover:ring-white/30 transition-all duration-200"
        >
          Masuk ke Portal
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-4xl w-full mx-auto px-6 py-12 text-center flex flex-col items-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-6 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Platform Pembelajaran Coding Terstruktur untuk Generasi Digital</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.15] mb-6">
          Belajar Koding Jadi <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-amber-300 bg-clip-text text-transparent">Petualangan Seru</span> & Terarah
        </h1>

        {/* Subheading */}
        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mb-8 leading-relaxed">
          Kurikulum interaktif mulai dari blok visual Scratch, logika algoritma, hingga Python dan Web Development dengan gamifikasi Quest Map dan panduan AI Byte Copilot.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-sm font-black bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:-translate-y-0.5 active:scale-95 transition-all duration-150"
          >
            <span>Mulai Petualangan Belajar</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-sm font-bold bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 transition-all duration-150"
          >
            <span>Masuk Akun Siswa & Guru</span>
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 w-full text-left">
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 backdrop-blur-sm">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-3">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Quest Map Interaktif</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Jalur belajar bertahap dengan XP, badge pencapaian, dan kuis pemahaman materi.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 backdrop-blur-sm">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Byte AI Copilot</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Asisten AI cerdas untuk merancang kurikulum, kuis, dan penjelasan kode ramah anak.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 backdrop-blur-sm">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
              <Trophy className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Evaluasi & Sertifikasi</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Laporan perkembangan belajar transparan untuk orang tua dan guru pengajar.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Bits2Bytes LMS. Hak Cipta Dilindungi.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Sistem Pembelajaran Terverifikasi
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
