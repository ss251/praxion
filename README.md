# AgentGate × CRE — Verifiable Agent Commerce Protocol

> **Chainlink Convergence Hackathon 2025**

A protocol enabling AI agents to discover, pay for, and consume services with cryptographic verifiability — powered by [Chainlink CRE](https://docs.chain.link/cre) (Compute Runtime Environment) and the [x402](https://www.x402.org/) payment standard.

## The Problem

AI agents increasingly need to call external services (APIs, LLMs, data feeds) autonomously. But there's no verifiable way to:
1. **Prove** a service was actually executed
2. **Settle** payments atomically with service delivery
3. **Attest** to the result with decentralized consensus

## The Solution

AgentGate × CRE creates a **verifiable agent commerce layer** where:

```
AI Agent → HTTP Request + x402 Payment Proof
  → CRE DON validates payment & executes service
  → DON consensus on the result
  → On-chain settlement with signed attestation
  → Agent receives DON-signed response
```

Every service call is:
- **Paid** via x402 (HTTP 402 Payment Required standard with stablecoin payments)
- **Executed** by Chainlink's Decentralized Oracle Network (DON)
- **Verified** through multi-node consensus
- **Settled** on-chain with a DON-signed report

## Architecture

### CRE Workflow (`workflow/`)

A TypeScript workflow deployed to Chainlink's DON:

1. **HTTP Trigger** — Receives requests from AI agents
2. **x402 Validation** — Verifies payment proof from headers
3. **Service Execution** — Calls the requested API via `HTTPClient` with DON consensus
4. **Report Generation** — Creates a DON-signed attestation of the result
5. **On-chain Settlement** — Writes to `AgentGateSettlement` via `EVMClient.writeReport()`

### Smart Contract (`contracts/`)

**`AgentGateSettlement.sol`** — Extends Chainlink's `ReceiverTemplate`:
- Receives DON-signed reports via the Chainlink Forwarder
- Records: agent address, service hash, payment amount, result hash, timestamp
- Emits `ServiceExecuted` and `PaymentSettled` events
- Provides on-chain proof of every agent-service interaction

### x402 Payment Flow

```
Agent                    CRE DON                  Settlement Contract
  │                        │                              │
  ├─ POST /service ───────►│                              │
  │  + X-PAYMENT header    │                              │
  │  + intent body         │                              │
  │                        ├─ Validate payment            │
  │                        ├─ Execute service (consensus) │
  │                        ├─ Sign report ────────────────►│
  │                        │                              ├─ Record settlement
  │◄─ DON-signed result ──┤                              │
  │  + settlement txHash   │                              │
```

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) runtime
- [Foundry](https://getfoundry.sh/) for smart contracts
- [CRE CLI](https://docs.chain.link/cre) (`~/.cre/bin/cre`)

### Smart Contracts

```bash
cd contracts
forge install
forge test
```

### Workflow

```bash
cd workflow
bun install
npx tsc --noEmit  # Type-check

# Simulate locally
cre workflow simulate --config config.staging.json

# Deploy to DON
cre login
cre workflow deploy --config config.staging.json
```

### Deploy Contract

Deploy `AgentGateSettlement` to Sepolia with the Chainlink Forwarder address:

```bash
forge create src/AgentGateSettlement.sol:AgentGateSettlement \
  --constructor-args 0x15fc6ae953e024d975e77382eeec56a9101f9f88 \
  --rpc-url $SEPOLIA_RPC \
  --private-key $PRIVATE_KEY
```

Then update `workflow/config.staging.json` with the deployed address.

## Project Structure

```
├── README.md
├── workflow/                    # CRE TypeScript workflow
│   ├── main.ts                 # Entry point: HTTP trigger → handler
│   ├── agentCallback.ts        # Core logic: validate, execute, settle
│   ├── x402.ts                 # x402 payment parsing & validation
│   ├── config.staging.json     # Sepolia testnet config
│   ├── package.json
│   └── tsconfig.json
├── contracts/                   # Foundry smart contracts
│   ├── src/
│   │   ├── AgentGateSettlement.sol      # Settlement contract
│   │   └── interfaces/
│   │       ├── IReceiver.sol            # CRE receiver interface
│   │       └── ReceiverTemplate.sol     # Base template with security
│   ├── test/
│   │   └── AgentGateSettlement.t.sol    # 10 passing tests
│   └── foundry.toml
```

## Supported Services

The workflow currently supports:

| Service | Description | Params |
|---------|-------------|--------|
| `price-feed` | Crypto price data | `coin`, `currency` |
| `market-data` | Detailed market info | `coin` |
| Custom | Any HTTP endpoint | `url`, `method`, `body` |

## Example Agent Request

```json
{
  "payment": {
    "network": "ethereum-sepolia",
    "txHash": "0x...",
    "token": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "amount": "100000",
    "payer": "0xAgentAddress",
    "payee": "0xServiceProvider",
    "timestamp": 1708000000
  },
  "intent": {
    "service": "price-feed",
    "params": {
      "coin": "ethereum",
      "currency": "usd"
    }
  }
}
```

## Key Technologies

- **[Chainlink CRE](https://docs.chain.link/cre)** — Decentralized compute with DON consensus
- **[x402](https://www.x402.org/)** — HTTP 402 Payment Required standard for machine payments
- **[AgentGate](https://github.com/thescoho/agentgate)** — AI agent gateway protocol

## License

MIT
