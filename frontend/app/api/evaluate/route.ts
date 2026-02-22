import { NextResponse } from "next/server";
import {
  encodeAbiParameters,
  parseAbiParameters,
  keccak256,
  toHex,
} from "viem";
import {
  publicClient,
  getWalletClient,
  ADDRESSES,
  POLICY_ABI,
  REGISTRY_ABI,
  VAULT_ABI,
  ERC20_ABI,
  ROUTER_ABI,
  SETTLEMENT_ABI,
} from "../../lib/contracts";

const REPORT_PARAMS = parseAbiParameters(
  "bytes32 reportId, address vault, address agent, uint8 verdict, (address sellToken, address buyToken, uint256 sellAmount, uint256 minBuyAmount, uint256 deadline) intent, uint256 navUsd6, uint16 postTradeExposureBps, uint256 expectedPriceUsd6, uint16 slippageBps, string reason"
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      sellAmount,
      minBuyAmount,
      deadline,
    }: {
      sellAmount: string;
      minBuyAmount: string;
      deadline: string;
    } = body;

    const steps: string[] = [];

    // ─── Step 1: Read on-chain policy ───
    steps.push("Reading on-chain policy constraints...");

    const constraints = await publicClient.readContract({
      address: ADDRESSES.policy,
      abi: POLICY_ABI,
      functionName: "constraints",
      args: [ADDRESSES.vault],
    });

    const maxTradeNotionalUsd6 = constraints.maxTradeNotionalUsd6;
    const maxSlippageBps = Number(constraints.maxSlippageBps);
    const maxPositionBps = Number(constraints.maxPositionBps);
    const cooldownSeconds = Number(constraints.cooldownSeconds);
    const slashBpsOnReject = Number(constraints.slashBpsOnReject);
    const agentStakeRequired = constraints.agentStakeRequired;

    steps.push(
      `Policy: maxTrade=${maxTradeNotionalUsd6}, maxSlippage=${maxSlippageBps}bps, maxPosition=${maxPositionBps}bps, cooldown=${cooldownSeconds}s`
    );

    // ─── Step 2: Check agent status ───
    steps.push("Checking agent status on-chain...");

    const [isActive, agentStake, lastTradeTime, routerPrice, routerPriceRaw] = await Promise.all([
      publicClient.readContract({
        address: ADDRESSES.registry,
        abi: REGISTRY_ABI,
        functionName: "isActiveAgent",
        args: [ADDRESSES.agent],
      }),
      publicClient.readContract({
        address: ADDRESSES.registry,
        abi: REGISTRY_ABI,
        functionName: "stakeOf",
        args: [ADDRESSES.agent],
      }),
      publicClient.readContract({
        address: ADDRESSES.vault,
        abi: VAULT_ABI,
        functionName: "lastTradeTime",
        args: [ADDRESSES.agent],
      }),
      publicClient.readContract({
        address: ADDRESSES.router,
        abi: ROUTER_ABI,
        functionName: "price",
      }),
      publicClient.readContract({
        address: ADDRESSES.router,
        abi: ROUTER_ABI,
        functionName: "priceRaw",
      }),
    ]);

    // Chainlink on-chain price (from router's price feed)
    const chainlinkPrice = Number(routerPriceRaw[0]) / (10 ** Number(routerPriceRaw[1]));
    const chainlinkUpdatedAt = Number(routerPriceRaw[2]);

    steps.push(`Agent active: ${isActive}, stake: ${agentStake}`);
    steps.push(`Chainlink ETH/USD (on-chain): $${chainlinkPrice.toFixed(2)} (updated ${new Date(chainlinkUpdatedAt * 1000).toISOString()})`);

    // ─── Step 3: Check cooldown ───
    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    const cooldownElapsed =
      lastTradeTime === 0n ||
      currentTime - lastTradeTime >= BigInt(cooldownSeconds);

    steps.push(`Cooldown: lastTrade=${lastTradeTime}, elapsed=${cooldownElapsed}`);

    // ─── Step 4: Read vault NAV ───
    steps.push("Reading vault NAV...");

    const [vaultUsdcBalance, vaultWethBalance] = await Promise.all([
      publicClient.readContract({
        address: ADDRESSES.usdc,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [ADDRESSES.vault],
      }),
      publicClient.readContract({
        address: ADDRESSES.weth,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [ADDRESSES.vault],
      }),
    ]);

    steps.push(`Vault: USDC=${vaultUsdcBalance}, WETH=${vaultWethBalance}`);

    // ─── Step 5: Fetch ETH price from 3 sources (DON consensus simulation) ───
    steps.push("Fetching ETH price from 3 sources (Chainlink + CoinGecko + CoinPaprika)...");

    // Source 1: Chainlink on-chain price feed (already fetched above)
    const priceChainlink = chainlinkPrice;

    // Sources 2 & 3: HTTP price APIs
    let priceCoinGecko = priceChainlink; // fallback
    let priceCoinPaprika = priceChainlink; // fallback

    try {
      const [cg, cp] = await Promise.all([
        fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
        ).then((r) => r.json()),
        fetch("https://api.coinpaprika.com/v1/tickers/eth-ethereum").then((r) =>
          r.json()
        ),
      ]);
      if (cg?.ethereum?.usd) priceCoinGecko = cg.ethereum.usd;
      if (cp?.quotes?.USD?.price) priceCoinPaprika = cp.quotes.USD.price;
    } catch {
      steps.push(`⚠ HTTP price fetch failed, using Chainlink price as fallback`);
    }

    // DON consensus: median of 3 sources
    const prices = [priceChainlink, priceCoinGecko, priceCoinPaprika].sort((a, b) => a - b);
    const avgPrice = prices[1]; // median
    const expectedPriceUsd6 = BigInt(Math.round(avgPrice * 1e6));

    steps.push(`Price source 1 (Chainlink on-chain): $${priceChainlink.toFixed(2)}`);
    steps.push(`Price source 2 (CoinGecko HTTP): $${priceCoinGecko.toFixed(2)}`);
    steps.push(`Price source 3 (CoinPaprika HTTP): $${priceCoinPaprika.toFixed(2)}`);
    steps.push(`DON consensus price (median of 3): $${avgPrice.toFixed(2)}`);

    // ─── Step 6: Evaluate constraints ───
    steps.push("Evaluating all constraints...");

    const sellAmountBig = BigInt(sellAmount);
    const minBuyAmountBig = BigInt(minBuyAmount);
    const navUsd6 = vaultUsdcBalance; // simplified: USDC as NAV proxy

    // Post-trade exposure
    const postTradeExposureBps =
      navUsd6 > 0n
        ? Number((sellAmountBig * 10000n) / navUsd6)
        : 10000;

    // Slippage: measured as max oracle source price divergence (DON consensus metric)
    // In production CRE, each DON node fetches independently; divergence = execution risk
    const maxPrice = Math.max(priceChainlink, priceCoinGecko, priceCoinPaprika);
    const minPrice = Math.min(priceChainlink, priceCoinGecko, priceCoinPaprika);
    const priceDivergence = maxPrice - minPrice;
    const slippageBps = avgPrice > 0
      ? Math.round((priceDivergence / avgPrice) * 10000)
      : 0;

    const reasons: string[] = [];

    if (!isActive) reasons.push("AGENT_NOT_ACTIVE");
    if (agentStake < agentStakeRequired)
      reasons.push(
        `INSUFFICIENT_STAKE: ${agentStake} < required ${agentStakeRequired}`
      );
    if (!cooldownElapsed) reasons.push("COOLDOWN_NOT_ELAPSED");
    if (sellAmountBig > maxTradeNotionalUsd6)
      reasons.push(
        `MAX_TRADE_EXCEEDED: $${Number(sellAmountBig) / 1e6} > max $${Number(maxTradeNotionalUsd6) / 1e6}`
      );
    if (postTradeExposureBps > maxPositionBps)
      reasons.push(
        `MAX_EXPOSURE_EXCEEDED: ${(postTradeExposureBps / 100).toFixed(1)}% > max ${(maxPositionBps / 100).toFixed(1)}%`
      );
    if (slippageBps > maxSlippageBps)
      reasons.push(
        `MAX_SLIPPAGE_EXCEEDED: ${(slippageBps / 100).toFixed(2)}% > max ${(maxSlippageBps / 100).toFixed(2)}%`
      );

    const approved = reasons.length === 0;
    const verdict = approved ? 0 : 1;
    const reasonStr = approved ? "ALL_CHECKS_PASSED" : reasons.join("; ");

    steps.push(`✓ Agent active: ${isActive}`);
    steps.push(`✓ Stake sufficient: ${agentStake >= agentStakeRequired}`);
    steps.push(`✓ Cooldown elapsed: ${cooldownElapsed}`);
    steps.push(
      `${sellAmountBig <= maxTradeNotionalUsd6 ? "✓" : "✗"} Trade notional: $${Number(sellAmountBig) / 1e6} (max $${Number(maxTradeNotionalUsd6) / 1e6})`
    );
    steps.push(
      `${postTradeExposureBps <= maxPositionBps ? "✓" : "✗"} Exposure: ${(postTradeExposureBps / 100).toFixed(1)}% (max ${(maxPositionBps / 100).toFixed(1)}%)`
    );
    steps.push(
      `${slippageBps <= maxSlippageBps ? "✓" : "✗"} Slippage: ${(slippageBps / 100).toFixed(2)}% (max ${(maxSlippageBps / 100).toFixed(2)}%)`
    );
    steps.push(`→ VERDICT: ${approved ? "APPROVE ✓" : "REJECT ✗"}`);

    // ─── Step 7: Write report on-chain ───
    steps.push("Writing verdict report to PraxionSettlement on-chain...");

    const reportId = keccak256(
      toHex(
        `${ADDRESSES.agent}-${ADDRESSES.vault}-${sellAmount}-${deadline}-${currentTime}`
      )
    );

    const reportData = encodeAbiParameters(REPORT_PARAMS, [
      reportId,
      ADDRESSES.vault,
      ADDRESSES.agent,
      verdict,
      {
        sellToken: ADDRESSES.usdc,
        buyToken: ADDRESSES.weth,
        sellAmount: sellAmountBig,
        minBuyAmount: minBuyAmountBig,
        deadline: BigInt(deadline),
      },
      navUsd6,
      postTradeExposureBps,
      expectedPriceUsd6,
      slippageBps,
      reasonStr,
    ]);

    const walletClient = getWalletClient();

    const txHash = await walletClient.writeContract({
      address: ADDRESSES.settlement,
      abi: SETTLEMENT_ABI,
      functionName: "onReport",
      args: [reportData],
    });

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    steps.push(`✓ Report written! Tx: ${txHash}`);
    steps.push(`  Block: ${receipt.blockNumber}, Gas used: ${receipt.gasUsed}`);

    // Read back agent stake (may have changed if slashed)
    const newStake = await publicClient.readContract({
      address: ADDRESSES.registry,
      abi: REGISTRY_ABI,
      functionName: "stakeOf",
      args: [ADDRESSES.agent],
    });

    if (newStake < agentStake) {
      const slashAmt = agentStake - newStake;
      steps.push(
        `⚠ Agent slashed: ${Number(slashAmt) / 1e18} pxSTK (${slashBpsOnReject / 100}% penalty)`
      );
    }

    return NextResponse.json({
      reportId,
      verdict: approved ? "APPROVE" : "REJECT",
      reason: reasonStr,
      txHash,
      blockNumber: Number(receipt.blockNumber),
      gasUsed: Number(receipt.gasUsed),
      steps,
      details: {
        navUsd6: navUsd6.toString(),
        postTradeExposureBps,
        expectedPriceUsd6: expectedPriceUsd6.toString(),
        slippageBps,
        agentStake: newStake.toString(),
        tradeNotionalUsd6: sellAmount,
        routerPrice: Number(routerPrice),
        priceSources: {
          chainlink: priceChainlink,
          coinGecko: priceCoinGecko,
          coinPaprika: priceCoinPaprika,
          consensus: avgPrice,
        },
      },
      intent: {
        sellToken: ADDRESSES.usdc,
        buyToken: ADDRESSES.weth,
        sellAmount,
        minBuyAmount,
        deadline,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Evaluate error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
