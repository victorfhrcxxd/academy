import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Valeriote Cursos — Plataforma de Aulas ao Vivo",
  description:
    "Área de membros da Valeriote Cursos: acompanhe ao vivo as transmissões do seu curso presencial.",
  authors: [{ name: "Valeriote Cursos e Consultoria" }],
  manifest: "/site.webmanifest",
  appleWebApp: { title: "Valeriote" },
  icons: {
    icon: [
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className={`${inter.className} h-full antialiased`}>{children}</body>
    </html>
  );
}
