import Link from "next/link";

/* ─── Data ─── */
const FLOW = [
  {
    n: "01",
    title: "Propose",
    sub: "Agent submits trade intent",
    detail: "sell 1,000 USDC → buy WETH · slippage ≤ 0.50%",
  },
  {
    n: "02",
    title: "Read State",
    sub: "CRE queries on-chain constraints",
    detail: "Policy.constraints() · Registry.isActiveAgent() · Vault.lastTradeTime()",
  },
  {
    n: "03",
    title: "Price Consensus",
    sub: "3 sources → median price",
    detail: "Chainlink $1,950.24 · CoinGecko $1,950.69 · CoinPaprika $1,949.60",
  },
  {
    n: "04",
    title: "Verdict",
    sub: "APPROVE or REJECT on-chain",
    detail: "APPROVE → vault executes · REJECT → agent stake slashed 10%",
  },
];

const CONTRACTS = [
  ["PraxionVault", "Holds capital. executeTrade() gated by on-chain APPROVE report."],
  ["PraxionPolicy", "Per-vault constraints: max trade, slippage, exposure, cooldown."],
  ["PraxionSettlement", "Stores DON-signed verdicts. Triggers slashing on REJECT."],
  ["AgentRegistry", "Stake-based accountability. Slash on violation."],
];

const STACK: { name: string; href: string; icon: string }[] = [
  { name: "Chainlink CRE", href: "https://docs.chain.link/cre", icon: "/icons/chainlink.svg" },
  { name: "Data Feeds", href: "https://docs.chain.link/data-feeds", icon: "/icons/chainlink.svg" },
  { name: "DON Consensus", href: "https://docs.chain.link/architecture-overview/off-chain-reporting", icon: "/icons/chainlink.svg" },
  { name: "Solidity", href: "https://soliditylang.org", icon: "/icons/solidity.svg" },
  { name: "Foundry", href: "https://book.getfoundry.sh", icon: "/icons/foundry.svg" },
  { name: "Next.js", href: "https://nextjs.org", icon: "/icons/nextjs.svg" },
  { name: "viem", href: "https://viem.sh", icon: "/icons/viem.png" },
  { name: "Base", href: "https://base.org", icon: "/icons/base.svg" },
];

/* ─── Page ─── */
export default function Home() {
  return (
    <div className="min-h-screen">
      {/* ━━━ HERO ━━━ */}
      <section className="relative overflow-hidden dot-grid">
        {/* Accent glow */}
        <div className="absolute top-32 left-1/2 -translate-x-1/2 w-[480px] h-[480px] rounded-full opacity-[0.07] blur-[100px] pointer-events-none"
          style={{ background: "radial-gradient(circle, var(--blue), transparent 70%)" }} />

        <div className="relative max-w-6xl mx-auto px-6 pt-28 pb-20 md:pt-40 md:pb-28">
          {/* Eyebrow */}
          <div className="anim-enter flex items-center gap-2 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" />
            <span className="label">Chainlink Convergence Hackathon 2026</span>
          </div>

          {/* Headline — Fraunces optical size shines here */}
          <h1
            className="anim-enter anim-d1 text-[clamp(2.8rem,7vw,5.5rem)] leading-[1.05] tracking-[-0.025em] font-semibold max-w-[820px] mb-8"
            style={{ fontFamily: "var(--font-display)" }}
          >
            The safety layer between AI and capital
          </h1>

          {/* Sub */}
          <p className="anim-enter anim-d2 text-[17px] leading-relaxed max-w-xl mb-10"
            style={{ color: "var(--muted)", fontFamily: "var(--font-body)" }}>
            AI agents propose trades. Chainlink CRE evaluates constraints under DON consensus.
            The vault only executes with an on-chain APPROVE verdict. Violations get slashed.
          </p>

          {/* CTA row */}
          <div className="anim-enter anim-d3 flex flex-wrap gap-3">
            <Link href="/dashboard"
              className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[14px] font-medium transition-all duration-200"
              style={{
                background: "var(--blue)",
                fontFamily: "var(--font-body)",
                boxShadow: "0 0 0 1px rgba(55,91,210,0.3), 0 1px 2px rgba(0,0,0,0.4)",
              }}>
              Launch Dashboard
              <span className="opacity-60 group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>
            <a href="https://github.com/ss251/praxion" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[14px] font-medium transition-all duration-200 hover:bg-white/[0.04]"
              style={{
                border: "1px solid var(--border)",
                color: "var(--muted)",
                fontFamily: "var(--font-body)",
              }}>
              View Source
            </a>
          </div>
        </div>
      </section>

      {/* ━━━ STATS BAR ━━━ */}
      <section style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", background: "var(--card)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {[
            ["Oracle", "Chainlink ETH/USD", "Live on-chain feed"],
            ["Sources", "3", "Chainlink · CoinGecko · CoinPaprika"],
            ["Contracts", "8 deployed", "Base Sepolia testnet"],
            ["Tests", "33 / 33", "Forge passing"],
          ].map(([label, val, sub]) => (
            <div key={label}>
              <div className="label mb-1">{label}</div>
              <div className="text-[15px] font-medium" style={{ fontFamily: "var(--font-body)" }}>{val}</div>
              <div className="text-[11px] mt-0.5" style={{ color: "var(--dim)", fontFamily: "var(--font-mono)" }}>{sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━ FLOW ━━━ */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="mb-14">
          <span className="label">Protocol Flow</span>
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold tracking-tight mt-2" style={{ fontFamily: "var(--font-display)" }}>
            Four steps, zero trust
          </h2>
        </div>

        <div className="grid md:grid-cols-4 gap-px" style={{ background: "var(--border)", borderRadius: "12px", overflow: "hidden" }}>
          {FLOW.map((step) => (
            <div key={step.n} className="p-6 md:p-7 flex flex-col" style={{ background: "var(--card)" }}>
              <span className="text-[28px] font-semibold tracking-tight mb-4"
                style={{ fontFamily: "var(--font-display)", color: "var(--blue-soft)", opacity: 0.5 }}>
                {step.n}
              </span>
              <h3 className="text-[17px] font-semibold mb-1" style={{ fontFamily: "var(--font-body)" }}>
                {step.title}
              </h3>
              <p className="text-[13px] mb-4" style={{ color: "var(--muted)", fontFamily: "var(--font-body)" }}>
                {step.sub}
              </p>
              <div className="mt-auto pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                <code className="text-[11px] leading-relaxed block" style={{ color: "var(--dim)", fontFamily: "var(--font-mono)" }}>
                  {step.detail}
                </code>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━ ARCHITECTURE ━━━ */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="mb-10">
          <span className="label">System Design</span>
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold tracking-tight mt-2" style={{ fontFamily: "var(--font-display)" }}>
            Architecture
          </h2>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="p-6 md:p-10 overflow-x-auto">
            <svg viewBox="0 0 860 480" className="w-full min-w-[600px]" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <marker id="a" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                  <polygon points="0 0, 6 2, 0 4" fill="#4b6ee0" />
                </marker>
                <marker id="ag" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                  <polygon points="0 0, 6 2, 0 4" fill="#34d399" />
                </marker>
                <marker id="ar" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                  <polygon points="0 0, 6 2, 0 4" fill="#f87171" />
                </marker>
              </defs>

              {/* Column labels */}
              <text x="110" y="28" textAnchor="middle" fill="#64647a" fontSize="10" fontFamily="IBM Plex Mono, monospace" letterSpacing="0.08em">AI AGENT</text>
              <text x="420" y="28" textAnchor="middle" fill="#64647a" fontSize="10" fontFamily="IBM Plex Mono, monospace" letterSpacing="0.08em">CHAINLINK CRE</text>
              <text x="730" y="28" textAnchor="middle" fill="#64647a" fontSize="10" fontFamily="IBM Plex Mono, monospace" letterSpacing="0.08em">SMART CONTRACTS</text>

              {/* Boxes */}
              <rect x="30" y="38" width="160" height="36" rx="6" fill="none" stroke="#375BD230" strokeWidth="1" />
              <text x="110" y="61" textAnchor="middle" fill="#e4e4e8" fontSize="12" fontFamily="Outfit, sans-serif" fontWeight="500">Trade Proposer</text>

              <rect x="330" y="38" width="180" height="36" rx="6" fill="none" stroke="#375BD240" strokeWidth="1" />
              <text x="420" y="61" textAnchor="middle" fill="#e4e4e8" fontSize="12" fontFamily="Outfit, sans-serif" fontWeight="500">DON Consensus Judge</text>

              <rect x="650" y="38" width="160" height="36" rx="6" fill="none" stroke="#34d39930" strokeWidth="1" />
              <text x="730" y="61" textAnchor="middle" fill="#e4e4e8" fontSize="12" fontFamily="Outfit, sans-serif" fontWeight="500">On-chain Contracts</text>

              {/* Lifelines */}
              <line x1="110" y1="74" x2="110" y2="460" stroke="#ffffff08" strokeWidth="1" />
              <line x1="420" y1="74" x2="420" y2="460" stroke="#ffffff08" strokeWidth="1" />
              <line x1="730" y1="74" x2="730" y2="460" stroke="#ffffff08" strokeWidth="1" />

              {/* Step 1: Propose */}
              <line x1="190" y1="110" x2="330" y2="110" stroke="#4b6ee0" strokeWidth="1" markerEnd="url(#a)" />
              <text x="260" y="104" textAnchor="middle" fill="#64647a" fontSize="9" fontFamily="IBM Plex Mono, monospace">Trade Proposal</text>

              {/* Step 2: Read state */}
              <line x1="510" y1="150" x2="650" y2="150" stroke="#34d399" strokeWidth="1" markerEnd="url(#ag)" strokeDasharray="4 3" />
              <text x="580" y="144" textAnchor="middle" fill="#64647a" fontSize="9" fontFamily="IBM Plex Mono, monospace">constraints()</text>

              <line x1="510" y1="175" x2="650" y2="175" stroke="#34d399" strokeWidth="1" markerEnd="url(#ag)" strokeDasharray="4 3" />
              <text x="580" y="169" textAnchor="middle" fill="#64647a" fontSize="9" fontFamily="IBM Plex Mono, monospace">isActiveAgent()</text>

              <line x1="510" y1="200" x2="650" y2="200" stroke="#34d399" strokeWidth="1" markerEnd="url(#ag)" strokeDasharray="4 3" />
              <text x="580" y="194" textAnchor="middle" fill="#64647a" fontSize="9" fontFamily="IBM Plex Mono, monospace">lastTradeTime()</text>

              {/* Step 3: Price consensus */}
              <rect x="345" y="230" width="150" height="48" rx="6" fill="#375BD208" stroke="#375BD220" strokeWidth="1" />
              <text x="420" y="250" textAnchor="middle" fill="#64647a" fontSize="9" fontFamily="IBM Plex Mono, monospace">3-SOURCE CONSENSUS</text>
              <text x="420" y="268" textAnchor="middle" fill="#4b6ee0" fontSize="11" fontFamily="IBM Plex Mono, monospace" fontWeight="500">$1,950.24</text>

              {/* Step 4: Evaluate */}
              <rect x="345" y="296" width="150" height="36" rx="6" fill="#375BD20C" stroke="#375BD230" strokeWidth="1" />
              <text x="420" y="310" textAnchor="middle" fill="#64647a" fontSize="9" fontFamily="IBM Plex Mono, monospace">EVALUATE</text>
              <text x="420" y="324" textAnchor="middle" fill="#e4e4e8" fontSize="10" fontFamily="Outfit, sans-serif">Check all constraints</text>

              {/* Write verdict */}
              <line x1="495" y1="345" x2="650" y2="365" stroke="#4b6ee0" strokeWidth="1" markerEnd="url(#a)" />
              <rect x="650" y="352" width="160" height="36" rx="6" fill="#375BD208" stroke="#375BD220" strokeWidth="1" />
              <text x="730" y="366" textAnchor="middle" fill="#64647a" fontSize="9" fontFamily="IBM Plex Mono, monospace">SETTLEMENT</text>
              <text x="730" y="380" textAnchor="middle" fill="#e4e4e8" fontSize="10" fontFamily="Outfit, sans-serif">Store verdict report</text>

              {/* Slash */}
              <rect x="670" y="396" width="120" height="24" rx="4" fill="#f8717108" stroke="#f8717120" strokeWidth="1" />
              <text x="730" y="413" textAnchor="middle" fill="#f87171" fontSize="9" fontFamily="IBM Plex Mono, monospace">REJECT → slash()</text>

              {/* Verdict back */}
              <line x1="330" y1="380" x2="190" y2="380" stroke="#4b6ee0" strokeWidth="1" markerEnd="url(#a)" />
              <text x="260" y="374" textAnchor="middle" fill="#64647a" fontSize="9" fontFamily="IBM Plex Mono, monospace">verdict + reportId</text>

              {/* Execute */}
              <line x1="190" y1="430" x2="650" y2="440" stroke="#34d399" strokeWidth="1" markerEnd="url(#ag)" />
              <text x="400" y="424" textAnchor="middle" fill="#34d399" fontSize="9" fontFamily="IBM Plex Mono, monospace" opacity="0.6">executeTrade(reportId)</text>

              <rect x="650" y="430" width="160" height="30" rx="6" fill="#34d39908" stroke="#34d39920" strokeWidth="1" />
              <text x="730" y="450" textAnchor="middle" fill="#34d399" fontSize="10" fontFamily="Outfit, sans-serif" fontWeight="500">Verify → Swap</text>
            </svg>
          </div>
        </div>
      </section>

      {/* ━━━ CONTRACTS ━━━ */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="mb-10">
          <span className="label">On-chain</span>
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold tracking-tight mt-2" style={{ fontFamily: "var(--font-display)" }}>
            Smart Contracts
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-px rounded-xl overflow-hidden" style={{ background: "var(--border)" }}>
          {CONTRACTS.map(([name, desc]) => (
            <div key={name} className="p-6" style={{ background: "var(--card)" }}>
              <h3 className="text-[14px] font-medium mb-2" style={{ fontFamily: "var(--font-mono)", color: "var(--blue-soft)" }}>
                {name}
              </h3>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--muted)", fontFamily: "var(--font-body)" }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━ STACK ━━━ */}
      <section style={{ borderTop: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto px-6 py-16 text-center">
          <span className="label">Stack</span>
          <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] font-semibold tracking-tight mt-2 mb-8" style={{ fontFamily: "var(--font-display)" }}>
            Built with
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {STACK.map((t) => (
              <a
                key={t.name}
                href={t.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-[13px] transition-all duration-200 hover:scale-[1.03] hover:border-[var(--blue-soft)]"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  color: "var(--fg)",
                  fontFamily: "var(--font-body)",
                  fontWeight: 500,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={t.icon}
                  alt={t.name}
                  width={16}
                  height={16}
                  className="rounded-sm shrink-0"
                  style={{ width: 16, height: 16, objectFit: "contain" }}
                />
                {t.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ DEPLOYED CONTRACTS ━━━ */}
      <section style={{ borderTop: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-10">
            <span className="label">On-Chain</span>
            <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] font-semibold tracking-tight mt-2" style={{ fontFamily: "var(--font-display)" }}>
              Deployed Contracts
            </h2>
            <p className="text-[13px] mt-2" style={{ color: "var(--muted)", fontFamily: "var(--font-body)" }}>
              Base Sepolia — All contracts verified and live
            </p>
          </div>
          <div className="grid gap-2 max-w-3xl mx-auto">
            {[
              { name: "PraxionVault", addr: "0xF03035A13c29AAC87Bf3855A5dc54362e87126D5", role: "Capital custody + trade execution" },
              { name: "PraxionPolicy", addr: "0x6ec4e63cA2c98d3f1EE9Da812551f5241baDAD8d", role: "Constraint parameters" },
              { name: "PraxionSettlement", addr: "0x35184a00e25Aa983e8e76Ba68867461b8FEc7bfE", role: "Verdict storage + slashing" },
              { name: "AgentRegistry", addr: "0xEAc52994285aD1508EC51D4E16EfaBBCB634587a", role: "Stake management" },
              { name: "MockRouter", addr: "0x70670390143E80e2D93D8bb3787F675DeC3761a4", role: "Chainlink ETH/USD feed reader" },
              { name: "USDC (Mock)", addr: "0x9989309119e6e41838d31dba30e97F09419B93b2", role: "Stablecoin" },
              { name: "WETH (Mock)", addr: "0x2e746D6a2aEcF969F6523CE0A3D4BaC0e03C1F94", role: "Wrapped Ether" },
              { name: "Chainlink ETH/USD", addr: "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1", role: "Live data feed (8 decimals)" },
            ].map((c) => (
              <a
                key={c.name}
                href={`https://base-sepolia.blockscout.com/address/${c.addr}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg transition-all duration-200 hover:border-[var(--blue-soft)] group"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[13px] font-medium shrink-0" style={{ fontFamily: "var(--font-mono)", color: "var(--blue-soft)" }}>
                    {c.name}
                  </span>
                  <span className="text-[11px] hidden sm:block" style={{ color: "var(--dim)", fontFamily: "var(--font-body)" }}>
                    {c.role}
                  </span>
                </div>
                <code className="text-[11px] shrink-0 group-hover:text-[var(--blue-soft)] transition-colors" style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                  {c.addr.slice(0, 6)}…{c.addr.slice(-4)} ↗
                </code>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ FOOTER ━━━ */}
      <footer style={{ borderTop: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <span className="text-[12px]" style={{ color: "var(--dim)", fontFamily: "var(--font-body)" }}>
            Praxion — The safety layer between AI and capital
          </span>
          <a href="https://github.com/ss251/praxion" target="_blank" rel="noopener noreferrer"
            className="text-[12px] hover:underline transition-all"
            style={{ color: "var(--dim)", fontFamily: "var(--font-mono)" }}>
            github.com/ss251/praxion
          </a>
        </div>
      </footer>
    </div>
  );
}
