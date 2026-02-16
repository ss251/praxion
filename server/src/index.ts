import express from "express";
import { paymentMiddleware } from "@x402/express";
import { x402ResourceServer, HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme, registerExactEvmScheme } from "@x402/evm/exact/server";
import type { Network } from "@x402/core/types";

const app = express();
app.use(express.json());

// ─── Config ───────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 4402;
const PAYEE_ADDRESS = process.env.PAYEE_ADDRESS || "0x03Fa0C3Cb262D2B5E82a9A718963B8df9da124D2";
const FACILITATOR_URL = process.env.FACILITATOR_URL || "https://x402.org/facilitator";
const NETWORK: Network = "eip155:84532"; // Base Sepolia

// ─── x402 Resource Server ─────────────────────────────────────────────
const facilitator = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
const resourceServer = new x402ResourceServer(facilitator);
registerExactEvmScheme(resourceServer, {});

// ─── Routes Config ────────────────────────────────────────────────────
const routes = {
  "GET /price/:coin": {
    accepts: {
      scheme: "exact" as const,
      network: NETWORK,
      payTo: PAYEE_ADDRESS,
      price: "$0.001",
    },
    description: "Real-time crypto price data",
    mimeType: "application/json",
  },
  "GET /analysis/:coin": {
    accepts: {
      scheme: "exact" as const,
      network: NETWORK,
      payTo: PAYEE_ADDRESS,
      price: "$0.001",
    },
    description: "Market analysis with signals",
    mimeType: "application/json",
  },
};

// ─── x402 Payment Middleware ──────────────────────────────────────────
app.use(
  paymentMiddleware(routes, resourceServer, { testnet: true })
);

// ─── Free endpoint ────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "praxion-x402-server",
    network: NETWORK,
    payee: PAYEE_ADDRESS,
    endpoints: ["/price/:coin", "/analysis/:coin"],
  });
});

// ─── Paid: Price data ─────────────────────────────────────────────────
app.get("/price/:coin", async (req, res) => {
  const coin = req.params.coin.toLowerCase();
  try {
    const cgRes = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`
    );
    const data = await cgRes.json();
    if (!data[coin]) {
      res.status(404).json({ error: `Coin '${coin}' not found` });
      return;
    }
    res.json({
      coin,
      price_usd: data[coin].usd,
      change_24h: data[coin].usd_24h_change,
      volume_24h: data[coin].usd_24h_vol,
      timestamp: Date.now(),
      source: "coingecko",
      powered_by: "praxion x402",
    });
  } catch (err) {
    console.error("CoinGecko error:", err);
    res.status(502).json({ error: "Failed to fetch price data" });
  }
});

// ─── Paid: Analysis ───────────────────────────────────────────────────
app.get("/analysis/:coin", async (req, res) => {
  const coin = req.params.coin.toLowerCase();
  try {
    const cgRes = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`
    );
    const data = await cgRes.json();
    if (!data[coin]) {
      res.status(404).json({ error: `Coin '${coin}' not found` });
      return;
    }

    const change = data[coin].usd_24h_change ?? 0;
    let signal: string;
    if (change > 5) signal = "STRONG_BUY";
    else if (change > 2) signal = "BUY";
    else if (change > -2) signal = "HOLD";
    else if (change > -5) signal = "SELL";
    else signal = "STRONG_SELL";

    res.json({
      coin,
      price_usd: data[coin].usd,
      change_24h_pct: change,
      volume_24h: data[coin].usd_24h_vol,
      market_cap: data[coin].usd_market_cap,
      signal,
      analysis: `${coin.toUpperCase()} is ${change >= 0 ? "up" : "down"} ${Math.abs(change).toFixed(2)}% in the last 24h. Signal: ${signal}.`,
      timestamp: Date.now(),
      source: "coingecko",
      powered_by: "praxion x402",
    });
  } catch (err) {
    console.error("CoinGecko error:", err);
    res.status(502).json({ error: "Failed to fetch analysis data" });
  }
});

// ─── Start ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🔐 Praxion x402 Server running on http://localhost:${PORT}`);
  console.log(`   Network: ${NETWORK} (Base Sepolia)`);
  console.log(`   Payee:   ${PAYEE_ADDRESS}`);
  console.log(`   Facilitator: ${FACILITATOR_URL}`);
  console.log(`\n   Endpoints:`);
  console.log(`     GET /health          (free)`);
  console.log(`     GET /price/:coin     ($0.001 USDC)`);
  console.log(`     GET /analysis/:coin  ($0.001 USDC)\n`);
});
