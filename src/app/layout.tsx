import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClientToaster } from "@/components/ClientToaster";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const themeInitScript = `(() => {
  let savedTheme = null;
  try {
    savedTheme = localStorage.getItem("theme");
  } catch {
    // Storage may be unavailable; fall back to the operating-system preference.
  }
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  const isDark = savedTheme === "dark" || (savedTheme !== "light" && prefersDark);
  document.documentElement.classList.toggle("dark", isDark);
})();`;

export const metadata: Metadata = {
  title: "Bits2Bytes LMS",
  description: "Platform Belajar Coding Terstruktur untuk Anak",
  openGraph: {
    title: "Bits2Bytes LMS",
    description: "Platform Belajar Coding Terstruktur untuk Anak",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body className="min-h-full antialiased">
        {children}
        <ClientToaster />
      </body>
    </html>
  );
}
