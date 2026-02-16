import Link from "next/link";

const features = [
  {
    icon: "💳",
    title: "x402 Payments",
    description:
      "HTTP 402 Payment Required standard. Agents pay with stablecoins — no API keys, no subscriptions, just cryptographic payment proofs.",
  },
  {
    icon: "🔗",
    title: "DON Consensus",
    description:
      "Every service call is executed by Chainlink's Decentralized Oracle Network. Multi-node consensus ensures verifiable results.",
  },
  {
    icon: "⛓️",
    title: "Onchain Settlement",
    description:
      "DON-signed reports are written onchain. Every agent-service interaction has an immutable, auditable proof.",
  },
];

const steps = [
  {
    step: "01",
    title: "Agent Sends Request",
    description: "AI agent sends an HTTP request with x402 payment proof and service intent.",
    code: `POST /service
X-PAYMENT: <base64-proof>
{ "intent": { "service": "price-feed" } }`,
  },
  {
    step: "02",
    title: "DON Validates & Executes",
    description:
      "CRE workflow validates payment, executes the service across DON nodes, reaches consensus on the result.",
    code: `✓ Payment validated: 0.10 USDC
✓ Service executed (3/5 nodes agree)
✓ Report signed by DON`,
  },
  {
    step: "03",
    title: "Onchain Settlement",
    description:
      "DON-signed report is written to the PraxionSettlement contract. Agent receives result + settlement proof.",
    code: `Settlement {
  agent: 0xA1...
  serviceHash: 0x3f2a...
  resultHash: 0x8b1c...
  txHash: 0x9d4e...
}`,
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
              The Execution Layer for{" "}
              <span className="text-chainlink">Autonomous AI Agents</span>
            </h1>
            <p className="text-lg md:text-xl text-foreground/60 mb-10 max-w-2xl">
              AI agents discover, pay, and trigger verifiable onchain workflows via
              Chainlink CRE with DON consensus + onchain settlement.
            </p>
            <div className="flex gap-4">
              <Link
                href="/dashboard"
                className="px-6 py-3 bg-chainlink hover:bg-chainlink-light rounded-lg font-medium transition-colors"
              >
                View Dashboard →
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
  │   AI Agent   │         │    Chainlink CRE     │         │  PraxionSettlement  │
  │              │         │   (DON Workflow)      │         │   (Onchain)         │
  └──────┬───────┘         └──────────┬───────────┘         └──────────┬──────────┘
         │                            │                                │
         │  POST /service             │                                │
         │  + x402 payment proof      │                                │
         ├───────────────────────────►│                                │
         │                            │                                │
         │                            ├─ Validate x402 payment         │
         │                            ├─ Execute service (consensus)   │
         │                            ├─ Generate DON-signed report    │
         │                            │                                │
         │                            ├───── writeReport() ───────────►│
         │                            │                                ├─ Record settlement
         │                            │                                ├─ Emit ServiceExecuted
         │                            │                                ├─ Emit PaymentSettled
         │                            │                                │
         │◄───────────────────────────┤                                │
         │  DON-signed result         │                                │
         │  + settlement txHash       │                                │
         │                            │                                │`}
          </pre>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold mb-12 text-center">Key Features</h2>
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

      {/* Tech Stack */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-card-border">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Built With</h2>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            {[
              "Chainlink CRE",
              "x402 Standard",
              "Solidity",
              "TypeScript",
              "Foundry",
              "Sepolia Testnet",
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
          <span>◆ Praxion — Chainlink Convergence Hackathon 2025</span>
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
