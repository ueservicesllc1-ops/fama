import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AppProviders } from "@/components/providers/AppProviders";
import { PwaRegister } from "@/components/pwa/PwaRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#0B0F17",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "FAMA | Plataforma Digital Integral — Fe · Amor · Misión · Almas",
  description: "Plataforma digital integral para la congregación cristiana FAMA. Cultos en vivo en auditorio virtual interactivo, biblioteca de predicaciones y comunidad global.",
  keywords: ["FAMA", "Iglesia Cristiana", "Fe Amor Misión Almas", "Auditorio Virtual", "Cultos en Vivo", "Predicaciones", "PWA"],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FAMA",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#070B14] text-slate-100 selection:bg-[#D4AF37]/30 selection:text-[#F3D079]">
        <AppProviders>
          <PwaRegister />
          <Header />
          <main className="flex-1 flex flex-col">{children}</main>
          <Footer />
        </AppProviders>
      </body>
    </html>
  );
}
