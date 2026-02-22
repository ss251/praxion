// tradeEvalCallback.ts — CRE callback: evaluate trade proposal against on-chain policy
// This is the core of Praxion v2: CRE as execution court.

import {
  cre,
  type Runtime,
  type HTTPPayload,
  getNetwork,
  bytesToHex,
  hexToBase64,
  TxStatus,
  decodeJson,
  encodeCallMsg,
  consensusIdenticalAggregation,
  type HTTPSendRequester,
} from "@chainlink/cre-sdk";
import {
  encodeAbiParameters,
  parseAbiParameters,
  encodeFunctionData,
  decodeFunctionResult,
  keccak256,
  toHex,
  zeroAddress,
} from "viem";

// ===========================
// Config
// ===========================
export type Config = {
  evms: Array<{
    settlementAddress: string;
    policyAddress: string;
    registryAddress: string;
    vaultAddress: string;
    usdcAddress: string;
    wethAddress: string;
    agentAddress: string;
    chainlinkEthUsd: string;
    chainSelectorName: string;
    gasLimit: string;
  }>;
  priceFeedUrl1: string; // e.g. CoinGecko
  priceFeedUrl2: string; // e.g. CoinPaprika
};

// ===========================
// Types
// ===========================
interface TradeProposal {
  agent: string;
  vault: string;
  sellToken: string;
  buyToken: string;
  sellAmount: string; // uint256 as string
  minBuyAmount: string;
  deadline: string;
  asset: string; // human-readable e.g. "WETH"
}

interface PolicyConstraints {
  maxTradeNotionalUsd6: bigint;
  maxSlippageBps: number;
  maxPositionBps: number;
  cooldownSeconds: number;
  onlyAllowedAssets: boolean;
  agentStakeRequired: bigint;
  slashBpsOnReject: number;
}

interface EvalResult {
  approved: boolean;
  reasons: string[];
  navUsd6: bigint;
  postTradeExposureBps: number;
  expectedPriceUsd6: bigint;
  slippageBps: number;
}

// ===========================
// Contract ABIs (for EVM reads)
// ===========================
const POLICY_ABI = [
  {
    name: "constraints",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "vault", type: "address" }],
    outputs: [{
      name: "", type: "tuple",
      components: [
        { name: "maxTradeNotionalUsd6", type: "uint256" },
        { name: "maxSlippageBps", type: "uint16" },
        { name: "maxPositionBps", type: "uint16" },
        { name: "cooldownSeconds", type: "uint32" },
        { name: "onlyAllowedAssets", type: "bool" },
        { name: "agentStakeRequired", type: "uint256" },
        { name: "slashBpsOnReject", type: "uint16" },
      ],
    }],
  },
  {
    name: "isAllowedAsset",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "vault", type: "address" },
      { name: "asset", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const REGISTRY_ABI = [
  {
    name: "isActiveAgent",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "stakeOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const VAULT_ABI = [
  {
    name: "lastTradeTime",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// ERC20 balanceOf for vault NAV calculation
const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// ===========================
// Helper: cast config string to 0x address
// ===========================
const addr = (s: string): `0x${string}` => s as `0x${string}`;

// Report encoding: matches PraxionSettlement.onReport decoding
const REPORT_PARAMS = parseAbiParameters(
  "bytes32 reportId, address vault, address agent, uint8 verdict, (address sellToken, address buyToken, uint256 sellAmount, uint256 minBuyAmount, uint256 deadline) intent, uint256 navUsd6, uint16 postTradeExposureBps, uint256 expectedPriceUsd6, uint16 slippageBps, string reason"
);

// ===========================
// Chainlink AggregatorV3 ABI
// ===========================
const AGGREGATOR_V3_ABI = [
  {
    name: "latestRoundData",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
] as const;

// ===========================
// Price fetching
// ===========================
interface PriceResult {
  priceUsd: number;
}

const buildPriceRequest =
  (url: string) =>
  (sendRequester: HTTPSendRequester, _config: Config): PriceResult => {
    const resp = sendRequester
      .sendRequest({
        url,
        method: "GET",
        headers: { Accept: "application/json" },
        cacheSettings: { store: true, maxAge: "15s" },
      })
      .result();

    const body = new TextDecoder().decode(resp.body);
    // Support both CoinGecko and CoinPaprika response shapes
    const json = JSON.parse(body);

    // CoinGecko: { ethereum: { usd: 3000 } }
    if (json.ethereum?.usd) {
      return { priceUsd: json.ethereum.usd };
    }
    // CoinPaprika: { quotes: { USD: { price: 3000 } } }
    if (json.quotes?.USD?.price) {
      return { priceUsd: json.quotes.USD.price };
    }
    // Fallback: assume { price: 3000 }
    if (json.price) {
      return { priceUsd: json.price };
    }
    throw new Error(`Cannot parse price from: ${body.substring(0, 200)}`);
  };

// ===========================
// Main HTTP Trigger Callback
// ===========================
export function onHttpTrigger(runtime: Runtime<Config>, payload: HTTPPayload): string {
  runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  runtime.log("Praxion v2: Trade Evaluation Workflow");
  runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    // ─── Step 1: Parse trade proposal ───
    if (!payload.input || payload.input.length === 0) {
      throw new Error("Empty request payload");
    }

    const proposal = decodeJson(payload.input) as TradeProposal;
    runtime.log(`[Step 1] Trade proposal from agent ${proposal.agent}`);
    runtime.log(`[Step 1] ${proposal.sellToken} → ${proposal.buyToken}, amount: ${proposal.sellAmount}`);

    // ─── Step 2: Read on-chain state (policy, agent, vault) ───
    runtime.log("[Step 2] Reading on-chain state...");

    const evmConfig = runtime.config.evms[0];
    const network = getNetwork({
      chainFamily: "evm",
      chainSelectorName: evmConfig.chainSelectorName,
      isTestnet: true,
    });
    if (!network) throw new Error(`Unknown chain: ${evmConfig.chainSelectorName}`);

    const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector);

    // 2a. Read policy constraints
    const policyData = encodeFunctionData({
      abi: POLICY_ABI,
      functionName: "constraints",
      args: [proposal.vault as `0x${string}`],
    });
    const policyResult = evmClient
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: addr(evmConfig.policyAddress), data: policyData }),
      })
      .result();
    const policyRaw = decodeFunctionResult({
      abi: POLICY_ABI,
      functionName: "constraints",
      data: bytesToHex(policyResult.data),
    }) as any;

    const constraints: PolicyConstraints = {
      maxTradeNotionalUsd6: BigInt(policyRaw.maxTradeNotionalUsd6),
      maxSlippageBps: Number(policyRaw.maxSlippageBps),
      maxPositionBps: Number(policyRaw.maxPositionBps),
      cooldownSeconds: Number(policyRaw.cooldownSeconds),
      onlyAllowedAssets: Boolean(policyRaw.onlyAllowedAssets),
      agentStakeRequired: BigInt(policyRaw.agentStakeRequired),
      slashBpsOnReject: Number(policyRaw.slashBpsOnReject),
    };

    runtime.log(`[Step 2a] Policy: maxTrade=${constraints.maxTradeNotionalUsd6}, maxSlippage=${constraints.maxSlippageBps}bps, maxPosition=${constraints.maxPositionBps}bps, cooldown=${constraints.cooldownSeconds}s`);

    // 2b. Check if agent is active
    const agentActiveData = encodeFunctionData({
      abi: REGISTRY_ABI,
      functionName: "isActiveAgent",
      args: [proposal.agent as `0x${string}`],
    });
    const agentActiveResult = evmClient
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: addr(evmConfig.registryAddress), data: agentActiveData }),
      })
      .result();
    const isActive = decodeFunctionResult({
      abi: REGISTRY_ABI,
      functionName: "isActiveAgent",
      data: bytesToHex(agentActiveResult.data),
    }) as boolean;

    runtime.log(`[Step 2b] Agent active: ${isActive}`);

    // 2c. Check agent stake
    const stakeData = encodeFunctionData({
      abi: REGISTRY_ABI,
      functionName: "stakeOf",
      args: [proposal.agent as `0x${string}`],
    });
    const stakeResult = evmClient
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: addr(evmConfig.registryAddress), data: stakeData }),
      })
      .result();
    const agentStake = decodeFunctionResult({
      abi: REGISTRY_ABI,
      functionName: "stakeOf",
      data: bytesToHex(stakeResult.data),
    }) as bigint;

    runtime.log(`[Step 2c] Agent stake: ${agentStake}`);

    // 2d. Check last trade time (cooldown)
    const lastTradeData = encodeFunctionData({
      abi: VAULT_ABI,
      functionName: "lastTradeTime",
      args: [proposal.agent as `0x${string}`],
    });
    const lastTradeResult = evmClient
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: addr(evmConfig.vaultAddress), data: lastTradeData }),
      })
      .result();
    const lastTradeTime = decodeFunctionResult({
      abi: VAULT_ABI,
      functionName: "lastTradeTime",
      data: bytesToHex(lastTradeResult.data),
    }) as bigint;

    runtime.log(`[Step 2d] Last trade time: ${lastTradeTime}`);

    // 2e. Check allowed asset
    let assetAllowed = true;
    if (constraints.onlyAllowedAssets) {
      const allowedData = encodeFunctionData({
        abi: POLICY_ABI,
        functionName: "isAllowedAsset",
        args: [proposal.vault as `0x${string}`, proposal.buyToken as `0x${string}`],
      });
      const allowedResult = evmClient
        .callContract(runtime, {
          call: encodeCallMsg({ from: zeroAddress, to: addr(evmConfig.policyAddress), data: allowedData }),
        })
        .result();
      assetAllowed = decodeFunctionResult({
        abi: POLICY_ABI,
        functionName: "isAllowedAsset",
        data: bytesToHex(allowedResult.data),
      }) as boolean;
    }

    runtime.log(`[Step 2e] Asset allowed: ${assetAllowed}`);

    // 2f. Read vault USDC + WETH balances for NAV
    const usdcBalData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [proposal.vault as `0x${string}`],
    });
    // For demo: we read USDC balance as proxy for NAV
    // In production you'd read both token balances and compute full NAV
    const usdcBalResult = evmClient
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: addr(proposal.sellToken), data: usdcBalData }),
      })
      .result();
    const vaultUsdcBalance = decodeFunctionResult({
      abi: ERC20_ABI,
      functionName: "balanceOf",
      data: bytesToHex(usdcBalResult.data),
    }) as bigint;

    runtime.log(`[Step 2f] Vault USDC balance: ${vaultUsdcBalance}`);

    // ─── Step 3: Fetch prices from 3 sources (DON consensus) ───
    // Source 1: Chainlink on-chain ETH/USD feed (real data feed)
    // Source 2: CoinGecko API (HTTP with DON consensus)
    // Source 3: CoinPaprika API (HTTP with DON consensus)
    runtime.log("[Step 3] Fetching prices from 3 sources...");

    // 3a. Read Chainlink ETH/USD price on-chain
    const chainlinkCallData = encodeFunctionData({
      abi: AGGREGATOR_V3_ABI,
      functionName: "latestRoundData",
      args: [],
    });
    const chainlinkResult = evmClient
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: addr(evmConfig.chainlinkEthUsd), data: chainlinkCallData }),
      })
      .result();
    const chainlinkRaw = decodeFunctionResult({
      abi: AGGREGATOR_V3_ABI,
      functionName: "latestRoundData",
      data: bytesToHex(chainlinkResult.data),
    }) as any;
    // latestRoundData returns [roundId, answer, startedAt, updatedAt, answeredInRound]
    // answer is at index 1 (or .answer). Try both access patterns.
    const rawAnswer = chainlinkRaw[1] ?? chainlinkRaw.answer ?? chainlinkRaw;
    // Chainlink ETH/USD has 8 decimals — convert BigInt safely
    const chainlinkPriceUsd = parseFloat(rawAnswer.toString()) / 1e8;

    runtime.log(`[Step 3a] Chainlink on-chain ETH/USD: $${chainlinkPriceUsd.toFixed(2)} (raw: ${rawAnswer})`);

    // 3b. CoinGecko price (HTTP with DON consensus)
    const httpClient = new cre.capabilities.HTTPClient();

    const price1 = httpClient
      .sendRequest(
        runtime,
        buildPriceRequest(runtime.config.priceFeedUrl1),
        consensusIdenticalAggregation<PriceResult>()
      )(runtime.config)
      .result();

    runtime.log(`[Step 3b] CoinGecko ETH/USD: $${price1.priceUsd}`);

    // 3c. CoinPaprika price (HTTP with DON consensus) — optional, may timeout
    let price2: PriceResult = { priceUsd: 0 };
    let hasCoinPaprika = false;
    try {
      price2 = httpClient
        .sendRequest(
          runtime,
          buildPriceRequest(runtime.config.priceFeedUrl2),
          consensusIdenticalAggregation<PriceResult>()
        )(runtime.config)
        .result();
      hasCoinPaprika = price2.priceUsd > 0;
      runtime.log(`[Step 3c] CoinPaprika ETH/USD: $${price2.priceUsd}`);
    } catch (e) {
      runtime.log(`[Step 3c] CoinPaprika unavailable (timeout), using 2-source consensus`);
    }

    // 3d. Consensus price (median of available sources)
    const prices = hasCoinPaprika
      ? [chainlinkPriceUsd, price1.priceUsd, price2.priceUsd].sort((a, b) => a - b)
      : [chainlinkPriceUsd, price1.priceUsd].sort((a, b) => a - b);
    // Median: middle value for 3 sources, average for 2
    const medianPrice = prices.length === 3
      ? prices[1]
      : (prices[0] + prices[1]) / 2;
    const expectedPriceUsd6 = BigInt(Math.round(medianPrice * 1e6));

    // Calculate max divergence between sources (slippage metric)
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const sourceDivergenceBps = medianPrice > 0
      ? Math.round(((maxPrice - minPrice) / medianPrice) * 10000)
      : 0;

    runtime.log(`[Step 3d] Consensus price (${prices.length} sources): $${medianPrice.toFixed(2)} (${expectedPriceUsd6} USD6)`);
    runtime.log(`[Step 3d] Source divergence: ${sourceDivergenceBps} bps`);
    // ─── Step 4: Evaluate constraints ───
    runtime.log("[Step 4] Evaluating constraints...");

    const sellAmount = BigInt(proposal.sellAmount);
    const minBuyAmount = BigInt(proposal.minBuyAmount);

    // Trade notional in USD (sellAmount is USDC with 6 decimals)
    const tradeNotionalUsd6 = sellAmount; // USDC is 1:1 USD

    // Expected buy amount based on price (WETH has 18 decimals)
    const expectedBuyAmount = (sellAmount * BigInt(1e18)) / expectedPriceUsd6;

    // Post-trade exposure: (existing WETH value + new WETH value) / total NAV
    // Simplified: new WETH position value as bps of current NAV
    const navUsd6 = vaultUsdcBalance; // simplified: USDC balance as NAV
    const postTradeExposureBps = navUsd6 > 0n
      ? Number((tradeNotionalUsd6 * 10000n) / navUsd6)
      : 10000;

    // Slippage: difference between expected and minimum buy amount
    const slippageBps = expectedBuyAmount > 0n
      ? Number(((expectedBuyAmount - minBuyAmount) * 10000n) / expectedBuyAmount)
      : 0;

    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    const cooldownElapsed = lastTradeTime === 0n ||
      (currentTime - lastTradeTime) >= BigInt(constraints.cooldownSeconds);

    // Build reasons for rejection
    const reasons: string[] = [];

    if (!isActive) {
      reasons.push("AGENT_NOT_ACTIVE: Agent is not staked or not allowlisted");
    }
    if (agentStake < constraints.agentStakeRequired) {
      reasons.push(`INSUFFICIENT_STAKE: ${agentStake} < required ${constraints.agentStakeRequired}`);
    }
    if (!cooldownElapsed) {
      reasons.push(`COOLDOWN_NOT_ELAPSED: last trade too recent`);
    }
    if (!assetAllowed) {
      reasons.push(`ASSET_NOT_ALLOWED: ${proposal.buyToken} not in allowed list`);
    }
    if (tradeNotionalUsd6 > constraints.maxTradeNotionalUsd6) {
      reasons.push(`MAX_TRADE_EXCEEDED: ${tradeNotionalUsd6} > max ${constraints.maxTradeNotionalUsd6}`);
    }
    if (postTradeExposureBps > constraints.maxPositionBps) {
      reasons.push(`MAX_EXPOSURE_EXCEEDED: ${postTradeExposureBps}bps > max ${constraints.maxPositionBps}bps`);
    }
    if (slippageBps > constraints.maxSlippageBps) {
      reasons.push(`MAX_SLIPPAGE_EXCEEDED: ${slippageBps}bps > max ${constraints.maxSlippageBps}bps`);
    }

    const approved = reasons.length === 0;
    const verdict = approved ? 0 : 1; // 0 = APPROVE, 1 = REJECT
    const reasonStr = approved ? "ALL_CHECKS_PASSED" : reasons.join("; ");

    runtime.log(`[Step 4] Verdict: ${approved ? "APPROVE ✓" : "REJECT ✗"}`);
    runtime.log(`[Step 4] Reason: ${reasonStr}`);
    runtime.log(`[Step 4] Post-trade exposure: ${postTradeExposureBps}bps`);
    runtime.log(`[Step 4] Slippage: ${slippageBps}bps`);

    // ─── Step 5: Generate and write report ───
    runtime.log("[Step 5] Writing verdict report to PraxionSettlement...");

    const reportId = keccak256(
      toHex(`${proposal.agent}-${proposal.vault}-${proposal.sellAmount}-${proposal.deadline}-${currentTime}`)
    );

    const reportData = encodeAbiParameters(REPORT_PARAMS, [
      reportId,
      proposal.vault as `0x${string}`,
      proposal.agent as `0x${string}`,
      verdict,
      {
        sellToken: proposal.sellToken as `0x${string}`,
        buyToken: proposal.buyToken as `0x${string}`,
        sellAmount: sellAmount,
        minBuyAmount: minBuyAmount,
        deadline: BigInt(proposal.deadline),
      },
      navUsd6,
      postTradeExposureBps,
      expectedPriceUsd6,
      slippageBps,
      reasonStr,
    ]);

    const reportResponse = runtime
      .report({
        encodedPayload: hexToBase64(reportData),
        encoderName: "evm",
        signingAlgo: "ecdsa",
        hashingAlgo: "keccak256",
      })
      .result();

    const writeResult = evmClient
      .writeReport(runtime, {
        receiver: evmConfig.settlementAddress,
        report: reportResponse,
        gasConfig: { gasLimit: evmConfig.gasLimit },
      })
      .result();

    if (writeResult.txStatus === TxStatus.SUCCESS) {
      const txHash = bytesToHex(writeResult.txHash || new Uint8Array(32));
      runtime.log(`[Step 5] ✓ Report written: ${txHash}`);
      runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      return JSON.stringify({
        reportId,
        verdict: approved ? "APPROVE" : "REJECT",
        reason: reasonStr,
        txHash,
        details: {
          navUsd6: navUsd6.toString(),
          postTradeExposureBps,
          expectedPriceUsd6: expectedPriceUsd6.toString(),
          slippageBps,
          agentStake: agentStake.toString(),
          tradeNotionalUsd6: tradeNotionalUsd6.toString(),
        },
      });
    }

    throw new Error(`Report write failed: ${writeResult.txStatus}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    runtime.log(`[ERROR] ${msg}`);
    runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    throw err;
  }
}
