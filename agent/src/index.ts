import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm";
import { wrapFetchWithPayment } from "@x402/fetch";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { decodePaymentResponseHeader } from "@x402/fetch";

// ─── Config ───────────────────────────────────────────────────────────
const PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error("❌ Set AGENT_PRIVATE_KEY env var (hex private key with 0x prefix)");
  process.exit(1);
}

const SERVER_URL = process.env.SERVER_URL || "http://localhost:4402";
const NETWORK = "eip155:84532"; // Base Sepolia

// ─── Wallet Setup ─────────────────────────────────────────────────────
const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
console.log(`\n🤖 Praxion AI Agent`);
console.log(`   Address: ${account.address}`);
console.log(`   Network: Base Sepolia`);
console.log(`   Server:  ${SERVER_URL}\n`);

// ─── x402 Client Setup ───────────────────────────────────────────────
// The account from viem's privateKeyToAccount implements signTypedData
// which satisfies the ClientEvmSigner interface
const evmScheme = new ExactEvmScheme(account);

const client = new x402Client().register(NETWORK, evmScheme);

const x402Fetch = wrapFetchWithPayment(fetch, client);

// ─── Helper ───────────────────────────────────────────────────────────
async function callEndpoint(path: string, label: string): Promise<void> {
  console.log(`\n━━━ ${label} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📡 GET ${SERVER_URL}${path}`);

  try {
    const response = await x402Fetch(`${SERVER_URL}${path}`);

    // Log payment info from response headers
    const paymentResponse = response.headers.get("PAYMENT-RESPONSE");
    if (paymentResponse) {
      try {
        const settlement = decodePaymentResponseHeader(paymentResponse);
        console.log(`💰 Payment settled!`);
        console.log(`   Transaction: ${settlement.transaction}`);
        console.log(`   Network:     ${settlement.network}`);
        console.log(`   Success:     ${settlement.success}`);
        if (settlement.payer) {
          console.log(`   Payer:       ${settlement.payer}`);
        }
      } catch {
        console.log(`💰 Payment header present (raw): ${paymentResponse.slice(0, 60)}...`);
      }
    }

    console.log(`📊 Status: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log(`📦 Response:`, JSON.stringify(data, null, 2));
    } else {
      const text = await response.text();
      console.log(`⚠️  Error: ${text}`);
    }
  } catch (err) {
    console.error(`❌ Request failed:`, err instanceof Error ? err.message : err);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  // 1. Health check (free)
  console.log("\n═══ STEP 1: Health Check (free) ═══════════════════");
  try {
    const healthRes = await fetch(`${SERVER_URL}/health`);
    const health = await healthRes.json();
    console.log("✅ Server healthy:", JSON.stringify(health, null, 2));
  } catch (err) {
    console.error("❌ Server not reachable. Is it running on", SERVER_URL, "?");
    process.exit(1);
  }

  // 2. Price feed (paid via x402)
  await callEndpoint("/price/ethereum", "Price: Ethereum");

  // 3. Price feed for another coin
  await callEndpoint("/price/bitcoin", "Price: Bitcoin");

  // 4. Market analysis (paid via x402)
  await callEndpoint("/analysis/ethereum", "Analysis: Ethereum");

  console.log("\n═══ DONE ══════════════════════════════════════════");
  console.log("🎉 All x402 payments processed successfully!");
  console.log(`   Agent address: ${account.address}`);
  console.log(`   Check transactions on Base Sepolia explorer\n`);
}

main().catch(console.error);
