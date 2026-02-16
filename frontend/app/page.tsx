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
        <div className="bg-card border border-card-border rounded-2xl p-8 font-mono text-sm leading-relaxed overflow-x-auto">
          <pre className="text-foreground/80">
{`  ┌─────────────┐         ┌──────────────────────┐         ┌─────────────────────┐
  │   AI Agent   │         │    Chainlink CRE     │         │   Smart Contracts   │
  │              │         │   (DON Workflow)      │         │                     │
  └──────┬───────┘         └──────────┬───────────┘         └──────────┬──────────┘
         │                            │                                │
         │  Trade Proposal            │                                │
         │  (sell USDC, buy WETH)     │                                │
         ├───────────────────────────►│                                │
         │                            │                                │
         │                            ├─ Read PraxionPolicy ──────────►│ constraints()
         │                            ├─ Read AgentRegistry ──────────►│ isActiveAgent()
         │                            ├─ Read Vault state ────────────►│ lastTradeTime()
         │                            │                                │
         │                            ├─ Fetch ETH price (source 1)    │
         │                            ├─ Fetch ETH price (source 2)    │
         │                            ├─ DON consensus on price        │
         │                            │                                │
         │                            ├─ Evaluate all constraints      │
         │                            ├─ Generate APPROVE/REJECT       │
         │                            │                                │
         │                            ├── writeReport(verdict) ───────►│ PraxionSettlement
         │                            │                                ├─ Store TradeReport
         │                            │                                ├─ If REJECT → slash()
         │                            │                                │
         │◄───────────────────────────┤                                │
         │  Verdict + reportId        │                                │
         │                            │                                │
         ├─── executeTrade(reportId) ─────────────────────────────────►│ PraxionVault
         │                            │                                ├─ Verify APPROVE report
         │                            │                                ├─ Match intent fields
         │                            │                                ├─ Execute swap
         │                            │                                │`}
          </pre>
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
