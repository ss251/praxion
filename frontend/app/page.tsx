import Link from "next/link";

const features = [
  {
    icon: "🛡️",
    title: "Cryptographic Constraints",
    description:
      "AI agents propose trades. CRE evaluates policy constraints under DON consensus. Vault only executes with an on-chain APPROVE report.",
  },
  {
    icon: "⚖️",
    title: "On-chain Verdicts",
    description:
      "Every trade proposal gets an APPROVE or REJECT verdict written to the blockchain. No off-chain trust assumptions.",
  },
  {
    icon: "🔪",
    title: "Stake & Slash",
    description:
      "Agents stake collateral. Policy violations trigger automatic slashing. Economic skin in the game for AI actors.",
  },
];

const steps = [
  {
    step: "01",
    title: "Agent Proposes Trade",
    description: "AI agent sends a trade intent: sell USDC, buy WETH, with amount and slippage params.",
    code: `TradeProposal {
  agent:     0x2080...5717
  vault:     0x...Vault
  sell:      1000 USDC
  buy:       WETH
  slippage:  0.5%
}`,
  },
  {
    step: "02",
    title: "CRE Evaluates Constraints",
    description:
      "CRE reads policy from chain, fetches prices from 2 sources under DON consensus, checks all constraints: stake, cooldown, exposure, notional, slippage.",
    code: `✓ Agent staked: 500 USDC
✓ Cooldown elapsed: 120s > 60s
✓ Asset allowed: WETH
✓ Notional: $1,000 ≤ $1,000
✓ Exposure: 10% ≤ 30%
✓ Slippage: 0.18% ≤ 0.50%
→ VERDICT: APPROVE`,
  },
  {
    step: "03",
    title: "Verdict Written On-chain",
    description:
      "DON-signed report is written to PraxionSettlement via Chainlink Forwarder. If REJECT, agent stake is automatically slashed.",
    code: `TradeReport {
  verdict:   APPROVE
  reportId:  0x3f2a...d4e9
  exposure:  1000 bps
  slippage:  18 bps
  reason:    "ALL_CHECKS_PASSED"
  txHash:    0x9d4e...3f2a
}`,
  },
  {
    step: "04",
    title: "Vault Executes (or Blocks)",
    description:
      "Vault checks the on-chain report. APPROVE → trade executes. REJECT → reverts. No report → reverts. The vault never trusts the agent directly.",
    code: `vault.executeTrade(intent, reportId, agent)
  → Check: report.verdict == APPROVE ✓
  → Check: report matches intent ✓
  → Check: not expired, not replayed ✓
  → SWAP EXECUTED`,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-chainlink/5 to-transparent" />
        <div className="max-w-7xl mx-auto px-6 py-32 md:py-48 relative">
          <div className="max-w-3xl animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-chainlink/30 text-chainlink text-sm mb-6">
              <span className="w-2 h-2 rounded-full bg-chainlink animate-pulse" />
              Chainlink Convergence Hackathon 2025
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
              The Safety Layer Between{" "}
              <span className="text-chainlink">AI and Capital</span>
            </h1>
            <p className="text-lg md:text-xl text-foreground/60 mb-4 max-w-2xl">
              AI agents can act. Praxion ensures they act correctly.
            </p>
            <p className="text-base text-foreground/40 mb-10 max-w-2xl">
              Cryptographically constrained portfolio management via Chainlink CRE.
              Every trade evaluated under DON consensus. Every verdict on-chain.
            </p>
            <div className="flex gap-4">
              <Link
                href="/dashboard"
                className="px-6 py-3 bg-chainlink hover:bg-chainlink-light rounded-lg font-medium transition-colors"
              >
                Try Demo →
              </Link>
              <a
                href="https://github.com/ss251/praxion"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 border border-card-border hover:border-chainlink/50 rounded-lg font-medium transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Diagram */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold mb-10 text-center">Architecture</h2>
        <div className="bg-card border border-card-border rounded-2xl p-8 md:p-12 overflow-x-auto">
          <svg viewBox="0 0 900 620" className="w-full max-w-4xl mx-auto" xmlns="http://www.w3.org/2000/svg">
            {/* Defs */}
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#375BD2" />
              </marker>
              <marker id="arrow-green" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#22c55e" />
              </marker>
              <marker id="arrow-red" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
              </marker>
              <linearGradient id="agent-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#375BD2" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#375BD2" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="cre-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#375BD2" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#375BD2" stopOpacity="0.08" />
              </linearGradient>
              <linearGradient id="contract-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#22c55e" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Column headers */}
            <rect x="40" y="20" width="180" height="56" rx="12" fill="url(#agent-grad)" stroke="#375BD2" strokeWidth="1.5" />
            <text x="130" y="43" textAnchor="middle" fill="#a0aec0" fontSize="11" fontFamily="monospace">AI AGENT</text>
            <text x="130" y="61" textAnchor="middle" fill="white" fontSize="14" fontWeight="600">Trade Proposer</text>

            <rect x="340" y="20" width="220" height="56" rx="12" fill="url(#cre-grad)" stroke="#375BD2" strokeWidth="1.5" />
            <text x="450" y="43" textAnchor="middle" fill="#a0aec0" fontSize="11" fontFamily="monospace">CHAINLINK CRE</text>
            <text x="450" y="61" textAnchor="middle" fill="white" fontSize="14" fontWeight="600">DON Consensus Judge</text>

            <rect x="680" y="20" width="180" height="56" rx="12" fill="url(#contract-grad)" stroke="#22c55e" strokeWidth="1.5" />
            <text x="770" y="43" textAnchor="middle" fill="#a0aec0" fontSize="11" fontFamily="monospace">ON-CHAIN</text>
            <text x="770" y="61" textAnchor="middle" fill="white" fontSize="14" fontWeight="600">Smart Contracts</text>

            {/* Vertical lifelines */}
            <line x1="130" y1="76" x2="130" y2="600" stroke="#375BD2" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
            <line x1="450" y1="76" x2="450" y2="600" stroke="#375BD2" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
            <line x1="770" y1="76" x2="770" y2="600" stroke="#22c55e" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />

            {/* Step 1: Trade Proposal */}
            <rect x="48" y="110" width="164" height="44" rx="8" fill="#375BD210" stroke="#375BD2" strokeWidth="1" />
            <text x="130" y="128" textAnchor="middle" fill="#93a3c0" fontSize="10" fontFamily="monospace">STEP 1</text>
            <text x="130" y="144" textAnchor="middle" fill="white" fontSize="12" fontWeight="500">Trade Proposal</text>
            <line x1="212" y1="132" x2="340" y2="132" stroke="#375BD2" strokeWidth="1.5" markerEnd="url(#arrow)" />
            <text x="276" y="124" textAnchor="middle" fill="#a0aec0" fontSize="10" fontFamily="monospace">sell USDC → buy WETH</text>

            {/* Step 2: CRE reads chain */}
            <rect x="360" y="175" width="180" height="36" rx="6" fill="#22c55e10" stroke="#22c55e" strokeWidth="1" opacity="0.8" />
            <text x="450" y="198" textAnchor="middle" fill="#86efac" fontSize="11">Read Policy + Registry</text>
            <line x1="540" y1="193" x2="680" y2="193" stroke="#22c55e" strokeWidth="1" markerEnd="url(#arrow-green)" strokeDasharray="6 3" />
            <text x="610" y="185" textAnchor="middle" fill="#6ee7b7" fontSize="9" fontFamily="monospace">constraints()</text>

            <rect x="360" y="225" width="180" height="36" rx="6" fill="#22c55e10" stroke="#22c55e" strokeWidth="1" opacity="0.8" />
            <text x="450" y="248" textAnchor="middle" fill="#86efac" fontSize="11">Read Vault State</text>
            <line x1="540" y1="243" x2="680" y2="243" stroke="#22c55e" strokeWidth="1" markerEnd="url(#arrow-green)" strokeDasharray="6 3" />
            <text x="610" y="235" textAnchor="middle" fill="#6ee7b7" fontSize="9" fontFamily="monospace">lastTradeTime()</text>

            {/* Step 3: Price fetch */}
            <rect x="348" y="285" width="204" height="60" rx="8" fill="#375BD215" stroke="#375BD2" strokeWidth="1" />
            <text x="450" y="303" textAnchor="middle" fill="#93a3c0" fontSize="10" fontFamily="monospace">STEP 2 — PRICE CONSENSUS</text>
            <text x="450" y="320" textAnchor="middle" fill="white" fontSize="11">Chainlink Feed + CoinGecko</text>
            <text x="450" y="336" textAnchor="middle" fill="white" fontSize="11">+ CoinPaprika → Median</text>

            {/* Step 4: Evaluate */}
            <rect x="348" y="365" width="204" height="60" rx="8" fill="#375BD220" stroke="#375BD2" strokeWidth="1.5" />
            <text x="450" y="383" textAnchor="middle" fill="#93a3c0" fontSize="10" fontFamily="monospace">STEP 3 — EVALUATE</text>
            <text x="450" y="400" textAnchor="middle" fill="white" fontSize="12" fontWeight="500">Check All Constraints</text>
            <text x="450" y="416" textAnchor="middle" fill="#a0aec0" fontSize="10">stake · cooldown · exposure · slippage</text>

            {/* Step 5: Write verdict */}
            <line x1="552" y1="425" x2="680" y2="460" stroke="#375BD2" strokeWidth="1.5" markerEnd="url(#arrow)" />
            <rect x="680" y="440" width="180" height="50" rx="8" fill="#375BD215" stroke="#375BD2" strokeWidth="1.5" />
            <text x="770" y="460" textAnchor="middle" fill="#93a3c0" fontSize="10" fontFamily="monospace">PraxionSettlement</text>
            <text x="770" y="478" textAnchor="middle" fill="white" fontSize="12" fontWeight="500">Store Verdict Report</text>

            {/* REJECT → slash */}
            <rect x="700" y="498" width="140" height="28" rx="6" fill="#ef444420" stroke="#ef4444" strokeWidth="1" />
            <text x="770" y="517" textAnchor="middle" fill="#fca5a5" fontSize="11" fontWeight="500">If REJECT → slash()</text>

            {/* Verdict back to agent */}
            <line x1="340" y1="465" x2="212" y2="465" stroke="#375BD2" strokeWidth="1.5" markerEnd="url(#arrow)" />
            <text x="276" y="457" textAnchor="middle" fill="#a0aec0" fontSize="10" fontFamily="monospace">verdict + reportId</text>

            {/* Step 6: Execute */}
            <rect x="48" y="500" width="164" height="44" rx="8" fill="#22c55e15" stroke="#22c55e" strokeWidth="1.5" />
            <text x="130" y="518" textAnchor="middle" fill="#93a3c0" fontSize="10" fontFamily="monospace">STEP 4</text>
            <text x="130" y="534" textAnchor="middle" fill="white" fontSize="12" fontWeight="500">Execute Trade</text>
            <line x1="212" y1="522" x2="680" y2="560" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#arrow-green)" />

            <rect x="680" y="545" width="180" height="50" rx="8" fill="#22c55e15" stroke="#22c55e" strokeWidth="1.5" />
            <text x="770" y="565" textAnchor="middle" fill="#93a3c0" fontSize="10" fontFamily="monospace">PraxionVault</text>
            <text x="770" y="583" textAnchor="middle" fill="white" fontSize="12" fontWeight="500">Verify Report → Swap</text>

            {/* Labels on execute arrow */}
            <text x="420" y="540" textAnchor="middle" fill="#6ee7b7" fontSize="9" fontFamily="monospace">executeTrade(reportId)</text>
          </svg>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold mb-12 text-center">Why Praxion</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-card border border-card-border rounded-2xl p-8 hover:border-chainlink/30 transition-colors"
            >
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-xl font-semibold mb-3">{f.title}</h3>
              <p className="text-foreground/60 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold mb-12 text-center">How It Works</h2>
        <div className="space-y-8">
          {steps.map((s) => (
            <div
              key={s.step}
              className="bg-card border border-card-border rounded-2xl p-8 flex flex-col md:flex-row gap-8"
            >
              <div className="md:w-1/2">
                <div className="text-chainlink font-mono text-sm mb-2">Step {s.step}</div>
                <h3 className="text-2xl font-semibold mb-3">{s.title}</h3>
                <p className="text-foreground/60 leading-relaxed">{s.description}</p>
              </div>
              <div className="md:w-1/2">
                <pre className="bg-background border border-card-border rounded-lg p-4 text-sm font-mono text-foreground/70 overflow-x-auto">
                  {s.code}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contracts */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold mb-12 text-center">Smart Contracts</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { name: "PraxionVault", desc: "ERC-4626-style vault. Holds USDC + WETH. executeTrade() gated by on-chain APPROVE report." },
            { name: "PraxionPolicy", desc: "Per-vault constraints: max trade, slippage, exposure, cooldown, allowed assets, slash config." },
            { name: "PraxionAgentRegistry", desc: "Agent staking + allowlisting. stake(), unstake(), slash(). Economic accountability." },
            { name: "PraxionSettlement", desc: "Receives DON-signed reports via Chainlink Forwarder. Stores verdicts. Triggers slashing on REJECT." },
          ].map((c) => (
            <div key={c.name} className="bg-card border border-card-border rounded-xl p-6">
              <h3 className="font-mono text-chainlink font-semibold mb-2">{c.name}</h3>
              <p className="text-foreground/60 text-sm">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-card-border">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Built With</h2>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            {[
              "Chainlink CRE",
              "DON Consensus",
              "Solidity",
              "Foundry",
              "TypeScript",
              "Next.js",
              "Base Sepolia",
            ].map((tech) => (
              <span
                key={tech}
                className="px-4 py-2 bg-card border border-card-border rounded-full text-sm text-foreground/70"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-card-border py-8">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-sm text-foreground/40">
          <span>◆ Praxion — The safety layer between AI and capital</span>
          <a
            href="https://github.com/ss251/praxion"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground/60 transition-colors"
          >
            github.com/ss251/praxion
          </a>
        </div>
      </footer>
    </div>
  );
}
