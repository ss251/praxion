import type { Metadata } from "next";
import { Syne, JetBrains_Mono, DM_Sans } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-dm",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Praxion — The Safety Layer Between AI and Capital",
  description:
    "Cryptographically constrained AI portfolio management. Every trade evaluated under Chainlink DON consensus. Every verdict on-chain.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${syne.variable} ${jetbrains.variable} ${dmSans.variable} antialiased bg-background text-foreground`}
      >
        <nav className="fixed top-0 w-full z-50 border-b border-card-border/50 bg-background/90 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded-md bg-chainlink/10 border border-chainlink/30 flex items-center justify-center group-hover:bg-chainlink/20 transition-colors">
                <span className="text-chainlink text-xs font-bold" style={{ fontFamily: "var(--font-jetbrains)" }}>P</span>
              </div>
              <span className="text-base font-bold tracking-tight" style={{ fontFamily: "var(--font-syne)" }}>
                Praxion
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <Link href="/" className="px-3 py-1.5 text-sm text-muted hover:text-foreground rounded-md hover:bg-white/5 transition-all">
                Home
              </Link>
              <Link href="/dashboard" className="px-3 py-1.5 text-sm text-muted hover:text-foreground rounded-md hover:bg-white/5 transition-all">
                Dashboard
              </Link>
              <a
                href="https://github.com/ss251/praxion"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-sm text-muted hover:text-foreground rounded-md hover:bg-white/5 transition-all"
              >
                GitHub ↗
              </a>
            </div>
          </div>
        </nav>
        <main className="pt-14">{children}</main>
      </body>
    </html>
  );
}
