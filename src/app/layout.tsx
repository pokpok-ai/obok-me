import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "obok.me — Ceny transakcyjne nieruchomosci w Polsce",
  description:
    "Sprawdz realne ceny transakcyjne mieszkan, domow i dzialek w Twojej okolicy. Dane z Rejestru Cen Nieruchomosci (RCN).",
  keywords: [
    "ceny nieruchomosci",
    "ceny transakcyjne",
    "mieszkania",
    "Polska",
    "mapa cen",
    "RCN",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
