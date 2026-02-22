import Link from "next/link";

const CONTRACTS = [
  {
    name: "PraxionVault",
    role: "Capital Custodian",
    desc: "Holds USDC + WETH. executeTrade() is gated — only fires with a matching on-chain APPROVE report. No report, no execution.",
    color: "chainlink",
  },
  {
    name: "PraxionPolicy",
    role: "Constraint Engine",
    desc: "Per-vault rules: max trade size, slippage tolerance, exposure limits, cooldown periods, allowed asset whitelist.",
    color: "chainlink",
  },
  {
    name: "PraxionSettlement",
    role: "Verdict Recorder",
    desc: "Receives DON-signed reports via Chainlink Forwarder. Stores every APPROVE and REJECT. Triggers slashing on violations.",
    color: "chainlink",
  },
  {
    name: "AgentRegistry",
    role: "Accountability Layer",
    desc: "Agents stake collateral to act. Violations trigger automatic slashing. Economic skin in the game for every AI actor.",
    color: "chainlink",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen relative grid-bg">
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute top-[-200px] right-[-100px] w-[600px] h-[600px] rounded-full bg-chainlink/[0.04] blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-100px] left-[-200px] w-[500px] h-[500px] rounded-full bg-accent-green/[0.02] blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 pt-32 pb-24 md:pt-44 md:pb-32 relative z-10">
          <div className="max-w-4xl">
            {/* Badge */}
            <div className="animate-fade-up inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-chainlink/20 bg-chainlink/[0.06] mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
              <span className="text-xs tracking-widest uppercase" style={{ fontFamily: "var(--font-jetbrains)", color: "var(--text-muted)" }}>
                Chainlink Convergence Hackathon 2026
              </span>
            </div>

            {/* Headline */}
            <h1
              className="animate-fade-up text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[0.95] mb-8"
              style={{ fontFamily: "var(--font-syne)", animationDelay: "0.1s", opacity: 0 }}
            >
              The safety layer
              <br />
              between{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-chainlink to-chainlink-light animate-gradient">
                AI
              </span>{" "}
              and{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-green to-[#00c864]">
                capital
              </span>
            </h1>

            {/* Subhead */}
            <p
              className="animate-fade-up text-lg md:text-xl leading-relaxed max-w-2xl mb-12"
              style={{ fontFamily: "var(--font-dm)", color: "var(--text-muted)", animationDelay: "0.2s", opacity: 0 }}
            >
              AI agents propose trades. Chainlink CRE evaluates every constraint under DON consensus.
              Vault only executes with an on-chain APPROVE verdict. Violations get slashed.
            </p>

            {/* CTAs */}
            <div className="animate-fade-up flex flex-wrap gap-4" style={{ animationDelay: "0.3s", opacity: 0 }}>
              <Link
                href="/dashboard"
                className="group px-7 py-3.5 bg-chainlink hover:bg-chainlink-light rounded-lg font-semibold text-sm tracking-wide transition-all duration-300 hover:shadow-[0_0_30px_rgba(55,91,210,0.3)]"
                style={{ fontFamily: "var(--font-syne)" }}
              >
                Launch Dashboard
                <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              <a
                href="https://github.com/ss251/praxion"
                target="_blank"
                rel="noopener noreferrer"
                className="px-7 py-3.5 border border-card-border hover:border-chainlink/40 rounded-lg font-medium text-sm tracking-wide text-muted hover:text-foreground transition-all duration-300"
                style={{ fontFamily: "var(--font-syne)" }}
              >
                View Source
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── LIVE STATS RIBBON ─── */}
      <section className="border-y border-card-border/50 bg-card/30 backdrop-blur-sm relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-wrap items-center justify-between gap-6">
          {[
            { label: "Price Oracle", value: "Chainlink ETH/USD", sub: "Live on Base Sepolia" },
            { label: "DON Sources", value: "3", sub: "Chainlink · CoinGecko · CoinPaprika" },
            { label: "Contracts", value: "8", sub: "Deployed & verified" },
            { label: "Tests", value: "33/33", sub: "Forge passing" },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3">
              <div className="w-px h-8 bg-card-border hidden md:block first:hidden" />
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted" style={{ fontFamily: "var(--font-jetbrains)" }}>
                  {stat.label}
                </div>
                <div className="text-sm font-bold" style={{ fontFamily: "var(--font-syne)" }}>
                  {stat.value}
                </div>
                <div className="text-[10px] text-muted" style={{ fontFamily: "var(--font-dm)" }}>
                  {stat.sub}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS — TIMELINE ─── */}
      <section className="max-w-7xl mx-auto px-6 py-28 relative z-10">
        <div className="mb-16">
          <span
            className="text-xs tracking-[0.25em] uppercase text-chainlink"
            style={{ fontFamily: "var(--font-jetbrains)" }}
          >
            Protocol Flow
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold mt-3 tracking-tight" style={{ fontFamily: "var(--font-syne)" }}>
            Four steps. Zero trust.
          </h2>
        </div>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[23px] md:left-[31px] top-0 bottom-0 w-px bg-gradient-to-b from-chainlink/40 via-chainlink/20 to-transparent" />

          <div className="space-y-12">
            {[
              {
                num: "01",
                title: "Agent Proposes Trade",
                desc: "AI agent submits a trade intent — asset pair, amount, slippage tolerance. The proposal enters the CRE pipeline.",
                detail: "sell: 1,000 USDC → buy: WETH\nslippage: ≤ 0.50%",
                accent: "chainlink",
              },
              {
                num: "02",
                title: "CRE Reads On-chain State",
                desc: "Chainlink CRE reads policy constraints, agent registry, and vault state directly from smart contracts. No off-chain assumptions.",
                detail: "PraxionPolicy.constraints(vault)\nAgentRegistry.isActiveAgent(agent)\nVault.lastTradeTime(agent)",
                accent: "chainlink",
              },
              {
                num: "03",
                title: "DON Consensus on Price",
                desc: "Three independent price sources — Chainlink on-chain feed, CoinGecko, CoinPaprika — converge to a median. Divergence becomes the slippage metric.",
                detail: "Chainlink: $1,950.24\nCoinGecko:  $1,950.69\nCoinPaprika: $1,949.60\n─────────────────────\nConsensus:  $1,950.24  (0.06%)",
                accent: "accent-green",
              },
              {
                num: "04",
                title: "Verdict → Execute or Slash",
                desc: "CRE evaluates all constraints and writes an APPROVE or REJECT report on-chain. APPROVE unlocks the vault. REJECT triggers automatic stake slashing.",
                detail: "APPROVE → vault.executeTrade(reportId)\nREJECT  → registry.slash(agent, 10%)",
                accent: "accent-red",
              },
            ].map((step, i) => (
              <div key={step.num} className="relative flex gap-6 md:gap-10">
                {/* Number circle */}
                <div className="relative z-10 flex-shrink-0">
                  <div
                    className={`w-12 h-12 md:w-16 md:h-16 rounded-xl border-2 flex items-center justify-center ${
                      step.accent === "accent-green"
                        ? "border-accent-green/40 bg-accent-green/[0.06]"
                        : step.accent === "accent-red"
                        ? "border-accent-red/40 bg-accent-red/[0.06]"
                        : "border-chainlink/40 bg-chainlink/[0.06]"
                    }`}
                  >
                    <span
                      className={`text-lg md:text-xl font-bold ${
                        step.accent === "accent-green"
                          ? "text-accent-green"
                          : step.accent === "accent-red"
                          ? "text-accent-red"
                          : "text-chainlink"
                      }`}
                      style={{ fontFamily: "var(--font-jetbrains)" }}
                    >
                      {step.num}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 pb-4">
                  <h3 className="text-xl md:text-2xl font-bold mb-2 tracking-tight" style={{ fontFamily: "var(--font-syne)" }}>
                    {step.title}
                  </h3>
                  <p className="text-muted leading-relaxed mb-4 max-w-xl" style={{ fontFamily: "var(--font-dm)" }}>
                    {step.desc}
                  </p>
                  <div className="inline-block bg-card border border-card-border rounded-lg px-5 py-3">
                    <pre
                      className="text-xs md:text-sm whitespace-pre"
                      style={{
                        fontFamily: "var(--font-jetbrains)",
                        color: step.accent === "accent-green" ? "var(--accent-green)" : step.accent === "accent-red" ? "var(--accent-red)" : "var(--chainlink-blue-light)",
                        lineHeight: "1.6",
                      }}
                    >
                      {step.detail}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ARCHITECTURE SVG ─── */}
      <section className="max-w-7xl mx-auto px-6 py-20 relative z-10">
        <div className="mb-12">
          <span
            className="text-xs tracking-[0.25em] uppercase text-chainlink"
            style={{ fontFamily: "var(--font-jetbrains)" }}
          >
            System Design
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold mt-3 tracking-tight" style={{ fontFamily: "var(--font-syne)" }}>
            Architecture
          </h2>
        </div>
        <div className="bg-card border border-card-border rounded-2xl p-6 md:p-10 glow-blue overflow-x-auto">
          <svg viewBox="0 0 900 560" className="w-full max-w-4xl mx-auto" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <marker id="arr" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
                <polygon points="0 0, 7 2.5, 0 5" fill="#5a7de8" />
              </marker>
              <marker id="arr-g" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
                <polygon points="0 0, 7 2.5, 0 5" fill="#00e676" />
              </marker>
              <marker id="arr-r" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
                <polygon points="0 0, 7 2.5, 0 5" fill="#ff3d57" />
              </marker>
            </defs>

            {/* Columns */}
            <rect x="30" y="16" width="180" height="52" rx="10" fill="#375BD210" stroke="#375BD250" strokeWidth="1" />
            <text x="120" y="36" textAnchor="middle" fill="#6b6b80" fontSize="10" fontFamily="JetBrains Mono, monospace" letterSpacing="0.1em">AI AGENT</text>
            <text x="120" y="54" textAnchor="middle" fill="#e8e8ed" fontSize="13" fontWeight="700" fontFamily="Syne, sans-serif">Trade Proposer</text>

            <rect x="330" y="16" width="220" height="52" rx="10" fill="#375BD218" stroke="#375BD260" strokeWidth="1" />
            <text x="440" y="36" textAnchor="middle" fill="#6b6b80" fontSize="10" fontFamily="JetBrains Mono, monospace" letterSpacing="0.1em">CHAINLINK CRE</text>
            <text x="440" y="54" textAnchor="middle" fill="#e8e8ed" fontSize="13" fontWeight="700" fontFamily="Syne, sans-serif">DON Consensus Judge</text>

            <rect x="670" y="16" width="200" height="52" rx="10" fill="#00e67610" stroke="#00e67640" strokeWidth="1" />
            <text x="770" y="36" textAnchor="middle" fill="#6b6b80" fontSize="10" fontFamily="JetBrains Mono, monospace" letterSpacing="0.1em">ON-CHAIN</text>
            <text x="770" y="54" textAnchor="middle" fill="#e8e8ed" fontSize="13" fontWeight="700" fontFamily="Syne, sans-serif">Smart Contracts</text>

            {/* Lifelines */}
            <line x1="120" y1="68" x2="120" y2="540" stroke="#375BD2" strokeWidth="0.5" strokeDasharray="3 5" opacity="0.25" />
            <line x1="440" y1="68" x2="440" y2="540" stroke="#375BD2" strokeWidth="0.5" strokeDasharray="3 5" opacity="0.25" />
            <line x1="770" y1="68" x2="770" y2="540" stroke="#00e676" strokeWidth="0.5" strokeDasharray="3 5" opacity="0.25" />

            {/* 1: Proposal */}
            <rect x="44" y="100" width="152" height="40" rx="6" fill="#375BD20C" stroke="#375BD240" strokeWidth="0.8" />
            <text x="120" y="116" textAnchor="middle" fill="#6b6b80" fontSize="9" fontFamily="JetBrains Mono, monospace">STEP 01</text>
            <text x="120" y="132" textAnchor="middle" fill="#e8e8ed" fontSize="11" fontWeight="600">Trade Proposal</text>
            <line x1="196" y1="120" x2="330" y2="120" stroke="#5a7de8" strokeWidth="1.2" markerEnd="url(#arr)" />
            <text x="263" y="112" textAnchor="middle" fill="#6b6b80" fontSize="9" fontFamily="JetBrains Mono, monospace">sell USDC → buy WETH</text>

            {/* 2: Read chain */}
            <rect x="350" y="160" width="180" height="32" rx="5" fill="#00e67608" stroke="#00e67630" strokeWidth="0.8" />
            <text x="440" y="181" textAnchor="middle" fill="#86efac" fontSize="10" fontFamily="JetBrains Mono, monospace">Read Policy + Registry</text>
            <line x1="530" y1="176" x2="670" y2="176" stroke="#00e676" strokeWidth="0.8" markerEnd="url(#arr-g)" strokeDasharray="5 3" />

            <rect x="350" y="202" width="180" height="32" rx="5" fill="#00e67608" stroke="#00e67630" strokeWidth="0.8" />
            <text x="440" y="223" textAnchor="middle" fill="#86efac" fontSize="10" fontFamily="JetBrains Mono, monospace">Read Vault State</text>
            <line x1="530" y1="218" x2="670" y2="218" stroke="#00e676" strokeWidth="0.8" markerEnd="url(#arr-g)" strokeDasharray="5 3" />

            {/* 3: Price consensus */}
            <rect x="340" y="258" width="200" height="54" rx="7" fill="#375BD210" stroke="#375BD250" strokeWidth="1" />
            <text x="440" y="276" textAnchor="middle" fill="#6b6b80" fontSize="9" fontFamily="JetBrains Mono, monospace">STEP 02 — PRICE CONSENSUS</text>
            <text x="440" y="292" textAnchor="middle" fill="#e8e8ed" fontSize="10">Chainlink + CoinGecko + CoinPaprika</text>
            <text x="440" y="305" textAnchor="middle" fill="#5a7de8" fontSize="9" fontFamily="JetBrains Mono, monospace">median → $1,950.24</text>

            {/* 4: Evaluate */}
            <rect x="340" y="332" width="200" height="54" rx="7" fill="#375BD218" stroke="#375BD270" strokeWidth="1.2" />
            <text x="440" y="350" textAnchor="middle" fill="#6b6b80" fontSize="9" fontFamily="JetBrains Mono, monospace">STEP 03 — EVALUATE</text>
            <text x="440" y="366" textAnchor="middle" fill="#e8e8ed" fontSize="11" fontWeight="600">Check All Constraints</text>
            <text x="440" y="380" textAnchor="middle" fill="#6b6b80" fontSize="9">stake · cooldown · exposure · slippage</text>

            {/* 5: Write verdict */}
            <line x1="540" y1="386" x2="670" y2="416" stroke="#5a7de8" strokeWidth="1.2" markerEnd="url(#arr)" />
            <rect x="670" y="404" width="200" height="44" rx="7" fill="#375BD210" stroke="#375BD250" strokeWidth="1" />
            <text x="770" y="422" textAnchor="middle" fill="#6b6b80" fontSize="9" fontFamily="JetBrains Mono, monospace">PraxionSettlement</text>
            <text x="770" y="438" textAnchor="middle" fill="#e8e8ed" fontSize="11" fontWeight="500">Store Verdict Report</text>

            {/* Slash */}
            <rect x="694" y="456" width="152" height="26" rx="5" fill="#ff3d5714" stroke="#ff3d5740" strokeWidth="0.8" />
            <text x="770" y="474" textAnchor="middle" fill="#fca5a5" fontSize="10" fontWeight="500">If REJECT → slash()</text>

            {/* Verdict back */}
            <line x1="330" y1="430" x2="196" y2="430" stroke="#5a7de8" strokeWidth="1.2" markerEnd="url(#arr)" />
            <text x="263" y="422" textAnchor="middle" fill="#6b6b80" fontSize="9" fontFamily="JetBrains Mono, monospace">verdict + reportId</text>

            {/* 6: Execute */}
            <rect x="44" y="460" width="152" height="40" rx="6" fill="#00e67610" stroke="#00e67640" strokeWidth="1" />
            <text x="120" y="476" textAnchor="middle" fill="#6b6b80" fontSize="9" fontFamily="JetBrains Mono, monospace">STEP 04</text>
            <text x="120" y="492" textAnchor="middle" fill="#e8e8ed" fontSize="11" fontWeight="600">Execute Trade</text>
            <line x1="196" y1="480" x2="670" y2="510" stroke="#00e676" strokeWidth="1.2" markerEnd="url(#arr-g)" />
            <text x="420" y="502" textAnchor="middle" fill="#00e676" fontSize="9" fontFamily="JetBrains Mono, monospace" opacity="0.7">executeTrade(reportId)</text>

            <rect x="670" y="498" width="200" height="40" rx="7" fill="#00e67610" stroke="#00e67640" strokeWidth="1" />
            <text x="770" y="514" textAnchor="middle" fill="#6b6b80" fontSize="9" fontFamily="JetBrains Mono, monospace">PraxionVault</text>
            <text x="770" y="530" textAnchor="middle" fill="#e8e8ed" fontSize="11" fontWeight="500">Verify Report → Swap</text>
          </svg>
        </div>
      </section>

      {/* ─── CONTRACTS ─── */}
      <section className="max-w-7xl mx-auto px-6 py-20 relative z-10">
        <div className="mb-12">
          <span
            className="text-xs tracking-[0.25em] uppercase text-chainlink"
            style={{ fontFamily: "var(--font-jetbrains)" }}
          >
            On-chain
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold mt-3 tracking-tight" style={{ fontFamily: "var(--font-syne)" }}>
            Smart Contracts
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {CONTRACTS.map((c, i) => (
            <div
              key={c.name}
              className="hover-lift bg-card border border-card-border rounded-xl p-7 group"
            >
              <div className="flex items-start justify-between mb-3">
                <h3
                  className="text-base font-bold text-chainlink-light"
                  style={{ fontFamily: "var(--font-jetbrains)" }}
                >
                  {c.name}
                </h3>
                <span
                  className="text-[10px] tracking-[0.15em] uppercase px-2 py-0.5 rounded border border-card-border text-muted"
                  style={{ fontFamily: "var(--font-jetbrains)" }}
                >
                  {c.role}
                </span>
              </div>
              <p className="text-sm text-muted leading-relaxed" style={{ fontFamily: "var(--font-dm)" }}>
                {c.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── TECH STACK ─── */}
      <section className="border-t border-card-border/50 relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-10">
            <span
              className="text-xs tracking-[0.25em] uppercase text-chainlink"
              style={{ fontFamily: "var(--font-jetbrains)" }}
            >
              Stack
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold mt-3 tracking-tight" style={{ fontFamily: "var(--font-syne)" }}>
              Built With
            </h2>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              "Chainlink CRE",
              "DON Consensus",
              "Chainlink Data Feeds",
              "Solidity",
              "Foundry",
              "TypeScript",
              "Next.js",
              "Base Sepolia",
              "viem",
            ].map((tech) => (
              <span
                key={tech}
                className="px-4 py-2 bg-card border border-card-border rounded-full text-xs text-muted hover:text-foreground hover:border-chainlink/30 transition-all cursor-default"
                style={{ fontFamily: "var(--font-jetbrains)" }}
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-card-border/50 relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-chainlink/10 border border-chainlink/30 flex items-center justify-center">
              <span className="text-chainlink text-[9px] font-bold" style={{ fontFamily: "var(--font-jetbrains)" }}>P</span>
            </div>
            <span className="text-sm text-muted" style={{ fontFamily: "var(--font-dm)" }}>
              Praxion — The safety layer between AI and capital
            </span>
          </div>
          <a
            href="https://github.com/ss251/praxion"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted hover:text-foreground transition-colors"
            style={{ fontFamily: "var(--font-jetbrains)" }}
          >
            github.com/ss251/praxion
          </a>
        </div>
      </footer>
    </div>
  );
}
