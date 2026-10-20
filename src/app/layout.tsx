import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "OficinaOS | Gestão Ágil e Orçamentos Rápidos",
  description: "Sistema mobile-first para oficinas mecânicas: pátio em tempo real, aprovação rápida no WhatsApp e alertas de retorno em 6 meses.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} dark h-full bg-slate-950 text-slate-100`}>
      <body className="min-h-full flex flex-col font-sans antialiased bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
