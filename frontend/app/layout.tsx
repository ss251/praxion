import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Praxion — The Execution Layer for Autonomous AI Agents",
  description:
    "AI agents discover, pay, and trigger verifiable onchain workflows via Chainlink CRE with DON consensus + onchain settlement.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <nav className="fixed top-0 w-full z-50 border-b border-card-border bg-background/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold tracking-tight">
              <span className="text-chainlink">◆</span> Praxion
            </Link>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/" className="hover:text-chainlink transition-colors">
                Home
              </Link>
              <Link href="/dashboard" className="hover:text-chainlink transition-colors">
                Dashboard
              </Link>
              <a
                href="https://github.com/ss251/praxion"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-chainlink transition-colors"
              >
                GitHub ↗
              </a>
            </div>
          </div>
        </nav>
        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}
