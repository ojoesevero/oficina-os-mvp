import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "JS OrçaFácil | Gestão Ágil para Oficinas Mecânicas",
  description: "Sistema profissional para oficinas mecânicas e centros automotivos: pátio em tempo real, orçamentos no WhatsApp e alertas de revisão.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#080d14",
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
    <html lang="pt-BR" className={`${jakartaSans.variable} dark h-full bg-[#080d14] text-slate-100`}>
      <body className="min-h-full flex flex-col font-sans antialiased bg-[#080d14] text-slate-100 selection:bg-emerald-500 selection:text-[#080d14]">
        {children}
      </body>
    </html>
  );
}
