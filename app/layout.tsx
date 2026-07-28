import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Valeriote Cursos — Plataforma de Aulas ao Vivo",
  description:
    "Área de membros da Valeriote Cursos: acompanhe ao vivo as transmissões do seu curso presencial.",
  authors: [{ name: "Valeriote Cursos e Consultoria" }],
  icons: { icon: "/brand/valeriote-favicon.webp" },
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
