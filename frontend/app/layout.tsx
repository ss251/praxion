import type { Metadata } from "next";
import { Fraunces, Outfit, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz"],
});

const outfit = Outfit({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const ibmMono = IBM_Plex_Mono({
  variable: "--font-mono",
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
      <body className={`${fraunces.variable} ${outfit.variable} ${ibmMono.variable} antialiased`}>
        <nav className="fixed top-0 w-full z-50 bg-[#08080c]/80 backdrop-blur-xl border-b border-white/[0.04]">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="opacity-60 group-hover:opacity-100 transition-opacity">
                <rect x="2" y="2" width="16" height="16" rx="4" stroke="#375BD2" strokeWidth="1.5"/>
                <path d="M7 10L9.5 12.5L13 7.5" stroke="#375BD2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-[15px] font-medium tracking-tight text-white/80 group-hover:text-white transition-colors" style={{ fontFamily: "var(--font-body)" }}>
                Praxion
              </span>
            </Link>
            <div className="flex items-center gap-1">
              {[
                { href: "/dashboard", label: "Dashboard" },
                { href: "https://github.com/ss251/praxion", label: "GitHub", ext: true },
              ].map((link) =>
                link.ext ? (
                  <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1.5 text-[13px] text-white/40 hover:text-white/80 transition-colors rounded-md hover:bg-white/[0.04]"
                    style={{ fontFamily: "var(--font-body)" }}>
                    {link.label} ↗
                  </a>
                ) : (
                  <Link key={link.label} href={link.href}
                    className="px-3 py-1.5 text-[13px] text-white/40 hover:text-white/80 transition-colors rounded-md hover:bg-white/[0.04]"
                    style={{ fontFamily: "var(--font-body)" }}>
                    {link.label}
                  </Link>
                )
              )}
            </div>
          </div>
        </nav>
        <main className="pt-14">{children}</main>
      </body>
    </html>
  );
}
