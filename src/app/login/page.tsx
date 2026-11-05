// src/app/login/page.tsx
// Public sign-in page. Unauthenticated users are redirected here by middleware.
// Next.js 15: searchParams is a Promise.
import type { Metadata } from "next";
import Image from "next/image";
import { SignInForm as SignInFormBase } from "@/features/auth/components/SignInForm";

export const metadata: Metadata = { title: "Masuk — Bits2Bytes LMS" };

type Props = { searchParams: Promise<{ redirectTo?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { redirectTo } = await searchParams;
  return (
    <main className="min-h-screen py-[20px] flex items-center justify-center relative overflow-hidden
      bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950">

      {/* ── Decorative background orbs ──────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Large soft glow orb top-left */}
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full
          bg-gradient-to-br from-indigo-600/30 to-violet-700/20 blur-3xl" />
        {/* Medium orb bottom-right */}
        <div className="absolute -bottom-48 -right-32 w-[450px] h-[450px] rounded-full
          bg-gradient-to-tl from-purple-600/25 to-pink-600/15 blur-3xl" />
        {/* Small accent mid-right */}
        <div className="absolute top-1/3 right-10 w-64 h-64 rounded-full
          bg-gradient-to-br from-sky-500/20 to-indigo-500/10 blur-2xl" />

        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{backgroundImage: "linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)", backgroundSize: "48px 48px"}} />
      </div>

      {/* ── Login card ──────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-md px-4 animate-fade-in-up">

        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl
            bg-gradient-to-br from-indigo-500 to-violet-600
            shadow-2xl shadow-indigo-500/40 mb-5 ring-2 ring-white/20 overflow-hidden p-2">
            <Image
              src="/logo-b2b-dark.svg"
              alt="Bits2Bytes Logo"
              width={64}
              height={64}
              className="w-full h-full object-contain rounded-2xl"
              priority
            />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Bits<span className="text-[#7cc62f]">2</span>Bytes
          </h1>
        </div>

        {/* Form card */}
        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl
          ring-1 ring-white/20 p-8">

          <div className="mb-6">
            <h2 className="text-xl font-bold text-white tracking-tight">Selamat datang kembali 👋</h2>
            <p className="mt-1 text-sm text-indigo-200/70">Masuk untuk melanjutkan belajar</p>
          </div>

          {/* The form (preserves all actions/bindings) */}
          <SignInFormDark redirectTo={redirectTo} />
        </div>

        <p className="mt-6 text-center text-xs text-indigo-300/60">
          Belum punya akun?{" "}
          <span className="text-indigo-300 font-semibold">Hubungi administrator.</span>
        </p>
      </div>
    </main>
  );
}

// ── Dark-themed wrapper for SignInForm ──────────────────────────
// We wrap SignInForm here to apply dark-themed input overrides via className
// without touching the form actions or bindings.

function SignInFormDark({ redirectTo }: { redirectTo?: string }) {
  return (
    <div className="[&_label]:text-indigo-100 [&_label]:font-semibold
      [&_input]:bg-white/15 [&_input]:border-white/25 [&_input]:text-white
      [&_input]:placeholder:text-white/60 [&_input]:focus:ring-2 [&_input]:focus:ring-indigo-400
      [&_input]:focus:border-indigo-300 [&_input]:focus:shadow-[0_0_20px_rgba(129,140,248,0.35)]
      [&_input]:rounded-xl [&_input]:backdrop-blur-md [&_input]:hover:border-white/40
      [&_button[type=button]]:text-white/70 [&_button[type=button]]:hover:text-white
      [&_button[type=submit]]:bg-gradient-to-r [&_button[type=submit]]:from-indigo-500
      [&_button[type=submit]]:to-violet-600 [&_button[type=submit]]:hover:from-indigo-600
      [&_button[type=submit]]:hover:to-violet-700 [&_button[type=submit]]:shadow-lg
      [&_button[type=submit]]:shadow-indigo-500/40 [&_button[type=submit]]:text-white
      [&_button[type=submit]]:font-extrabold [&_button[type=submit]]:py-3 [&_button[type=submit]]:w-full
      [&_button[type=submit]]:rounded-xl [&_button[type=submit]]:text-base">
      <SignInFormBase redirectTo={redirectTo} />
    </div>
  );
}
