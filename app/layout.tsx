import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Valeriote Cursos Online - Capacitação para o Setor Público",
  description: "Plataforma de cursos online para servidores públicos, agentes políticos e profissionais que atuam com gestão pública",
  keywords: ["cursos online", "gestão pública", "licitações", "LGPD", "administração pública"],
  authors: [{ name: "Valeriote Cursos e Consultoria" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`${inter.className} h-full antialiased bg-valeriote-gray-50 text-valeriote-gray-900`}>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
