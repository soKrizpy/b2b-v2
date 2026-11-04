// src/features/auth/components/SignInForm.tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import type { SignInResult } from "@/features/auth/actions";
import { Button } from "@/components/ui/Button";
import { SignInErrors } from "./SignInErrors";

export function SignInForm({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter();
  const [state, setState] = useState<SignInResult | null>(null);
  const [pending, setPending] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setState(null);

    const formData = new FormData(e.currentTarget);
    const identifier = String(formData.get("identifier") ?? "");
    const password = String(formData.get("password") ?? "");
    const redirectTarget = String(formData.get("redirectTo") ?? redirectTo ?? "");

    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          password,
          redirectTo: redirectTarget || undefined,
        }),
      });
      const result: SignInResult & {
        sessionCookies?: Array<{ name: string; value: string }>;
      } = await res.json();
      setState(result);

      if (result.success) {
        setIsRedirecting(true);
        if (typeof document !== "undefined" && Array.isArray(result.sessionCookies)) {
          // On localhost (HTTP), SameSite=None;Secure won't stick — use Lax instead.
          const isLocalhost = typeof window !== "undefined" &&
            (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
          const cookieAttrs = isLocalhost
            ? "path=/; max-age=604800; SameSite=Lax"
            : "path=/; max-age=604800; SameSite=None; Secure; Partitioned";
          for (const c of result.sessionCookies) {
            document.cookie = `${c.name}=${encodeURIComponent(c.value)}; ${cookieAttrs}`;
          }
        }
        if (typeof window !== "undefined") {
          window.location.href = result.redirectTo;
        } else {
          router.replace(result.redirectTo);
          router.refresh();
        }
      }
    } catch {
      setState({
        success: false,
        error: "Terjadi kesalahan jaringan saat menghubungi server. Silakan coba lagi.",
      });
    } finally {
      setPending(false);
    }
  }

  const hasIdentifierError = Boolean(state && !state.success && state.fields?.identifier);
  const hasPasswordError   = Boolean(state && !state.success && state.fields?.password);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}

      {/* All error rendering delegated to the pure SignInErrors component */}
      <SignInErrors state={state} />

      {/* ── Identifier (email OR WhatsApp number) ──────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="signin-identifier" className="text-sm font-semibold text-slate-800 dark:text-slate-200 tracking-tight">
          Email atau Nomor WhatsApp
        </label>
        <input
          id="signin-identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          required
          placeholder="guru@b2b.id atau 08123456789"
          aria-describedby={hasIdentifierError ? "identifier-error" : undefined}
          className={`rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-400
            focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-200 shadow-sm focus:shadow-[0_0_15px_rgba(34,211,238,0.2)]
            ${hasIdentifierError
              ? "border-red-400 bg-red-50/50 dark:bg-red-950/40 text-red-900 dark:text-red-200 focus:ring-red-400"
              : "border-blue-500/50 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-blue-500 dark:hover:border-zinc-700"
            }`}
        />
      </div>

      {/* ── Password / PIN ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="signin-password" className="text-sm font-semibold text-slate-800 dark:text-slate-200 tracking-tight">
          Password atau 6 Digit PIN
        </label>
        <div className="relative">
          <input
            id="signin-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            aria-describedby={hasPasswordError ? "password-error" : undefined}
            className={`w-full rounded-xl border pl-3.5 pr-10 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-400
              focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-200 shadow-sm focus:shadow-[0_0_15px_rgba(34,211,238,0.2)]
              ${hasPasswordError
                ? "border-red-400 bg-red-50/50 dark:bg-red-950/40 text-red-900 dark:text-red-200 focus:ring-red-400"
                : "border-blue-500/50 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-blue-500 dark:hover:border-zinc-700"
              }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Sembunyikan password atau PIN" : "Tampilkan password atau PIN"}
            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors focus:outline-none"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* ── Submit ─────────────────────────────────────────────────────── */}
      <Button
        type="submit"
        loading={pending || isRedirecting}
        className="w-full justify-center py-2.5 focus:ring-2 focus:ring-cyan-400 focus:outline-none"
      >
        {isRedirecting ? "Mengalihkan…" : "Masuk"}
      </Button>
    </form>
  );
}
