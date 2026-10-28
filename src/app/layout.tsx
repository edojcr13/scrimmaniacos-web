import type { Metadata } from "next";
import { Inter, Rajdhani } from "next/font/google";
import { Suspense } from "react";
import Nav from "@/components/Nav";
import Flash from "@/components/Flash";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const display = Rajdhani({ variable: "--font-rajdhani", subsets: ["latin"], weight: ["600", "700"] });

export const metadata: Metadata = {
  title: { default: "Scrim Maníacos", template: "%s · Scrim Maníacos" },
  description: "Torneos, scrims y ranking de Pokémon UNITE y Pokémon Champions para Latinoamérica.",
  metadataBase: new URL("https://scrimmaniacos.com"),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${display.variable} min-h-screen font-sans antialiased`}>
        <Nav />
        <Suspense>
          <Flash />
        </Suspense>
        <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
        <footer className="border-t border-borde py-6 text-center text-xs text-suave">
          Scrim Maníacos · Comunidad competitiva de Pokémon en Latinoamérica. Sitio de fans, sin afiliación con
          The Pokémon Company ni Nintendo.
        </footer>
      </body>
    </html>
  );
}
