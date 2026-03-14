import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "e-Rapor SMP - Sistem Pengolahan Nilai Siswa",
  description: "Sistem informasi pengolahan nilai siswa SMP secara digital. Mengelola nilai harian, tugas, UTS, dan UAS serta menghasilkan rapor semester otomatis.",
  keywords: ["e-rapor", "nilai siswa", "rapor digital", "SMP", "sekolah"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-gray-950 text-white`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
