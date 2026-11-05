import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClientToaster } from "@/components/ClientToaster";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

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
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full antialiased">
        {children}
        <ClientToaster />
      </body>
    </html>
  );
}
