// reportMonitorCallback.ts — CRE Log Trigger callback
// Monitors ReportStored events from PraxionSettlement
// Provides post-verdict analytics: reads the full report, logs details, checks for slashing

import {
  cre,
  type Runtime,
  type EVMLog,
  getNetwork,
  bytesToHex,
  encodeCallMsg,
} from "@chainlink/cre-sdk";
import {
  decodeEventLog,
  parseAbi,
  encodeFunctionData,
  decodeFunctionResult,
  zeroAddress,
} from "viem";
import type { Config } from "./tradeEvalCallback";

const addr = (s: string): `0x${string}` => s as `0x${string}`;

// ===========================
// Event ABI
// ===========================
const REPORT_STORED_ABI = parseAbi([
  "event ReportStored(bytes32 indexed reportId, uint8 verdict, address indexed vault, address indexed agent)",
]);

// ABI for reading full report
const GET_REPORT_ABI = [
  {
    name: "getReport",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "reportId", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "reportId", type: "bytes32" },
          { name: "vault", type: "address" },
          { name: "agent", type: "address" },
          { name: "verdict", type: "uint8" },
          {
            name: "intent",
            type: "tuple",
            components: [
              { name: "sellToken", type: "address" },
              { name: "buyToken", type: "address" },
              { name: "sellAmount", type: "uint256" },
              { name: "minBuyAmount", type: "uint256" },
              { name: "deadline", type: "uint256" },
            ],
          },
          { name: "navUsd6", type: "uint256" },
          { name: "postTradeExposureBps", type: "uint16" },
          { name: "expectedPriceUsd6", type: "uint256" },
          { name: "slippageBps", type: "uint16" },
          { name: "reason", type: "string" },
          { name: "exists", type: "bool" },
        ],
      },
    ],
  },
] as const;

// ===========================
// Log Trigger Handler
// ===========================
export function onReportStoredLog(runtime: Runtime<Config>, log: EVMLog): string {
  runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  runtime.log("Praxion: Report Monitor — Post-Verdict Analysis");
  runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    // Step 1: Decode the ReportStored event
    const topics = log.topics.map((t: Uint8Array) => bytesToHex(t)) as [
      `0x${string}`,
      ...`0x${string}`[]
    ];
    const data = bytesToHex(log.data);

    const decoded = decodeEventLog({ abi: REPORT_STORED_ABI, data, topics });
    const reportId = decoded.args.reportId as `0x${string}`;
    const verdict = Number(decoded.args.verdict);
    const vault = decoded.args.vault as string;
    const agent = decoded.args.agent as string;

    const verdictStr = verdict === 0 ? "APPROVE ✓" : "REJECT ✗";
    runtime.log(`[Step 1] Report ${reportId.slice(0, 10)}... — ${verdictStr}`);
    runtime.log(`[Step 1] Vault: ${vault}`);
    runtime.log(`[Step 1] Agent: ${agent}`);

    // Step 2: Read the full report from settlement contract
    runtime.log("[Step 2] Reading full report from PraxionSettlement...");

    const evmConfig = runtime.config.evms[0];
    const network = getNetwork({
      chainFamily: "evm",
      chainSelectorName: evmConfig.chainSelectorName,
      isTestnet: true,
    });

    if (!network) {
      throw new Error(`Unknown chain: ${evmConfig.chainSelectorName}`);
    }

    const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector);

    const callData = encodeFunctionData({
      abi: GET_REPORT_ABI,
      functionName: "getReport",
      args: [reportId],
    });

    const readResult = evmClient
      .callContract(runtime, {
        call: encodeCallMsg({
          from: zeroAddress,
          to: addr(evmConfig.settlementAddress),
          data: callData,
        }),
      })
      .result();

    const report = decodeFunctionResult({
      abi: GET_REPORT_ABI,
      functionName: "getReport",
      data: bytesToHex(readResult.data),
    }) as any;

    // Step 3: Log full analysis
    runtime.log("[Step 3] Full Report Analysis:");
    runtime.log(`  NAV (USD6):           ${report.navUsd6}`);
    runtime.log(`  Post-Trade Exposure:  ${report.postTradeExposureBps} bps`);
    runtime.log(`  Expected Price:       ${report.expectedPriceUsd6} USD6`);
    runtime.log(`  Slippage:             ${report.slippageBps} bps`);
    runtime.log(`  Reason:               ${report.reason}`);
    runtime.log(`  Sell:                 ${report.intent.sellToken}`);
    runtime.log(`  Buy:                  ${report.intent.buyToken}`);
    runtime.log(`  Sell Amount:          ${report.intent.sellAmount}`);

    if (verdict === 1) {
      runtime.log("[ALERT] ⚠️  REJECT verdict — agent may be slashed");
    } else {
      runtime.log("[OK] ✓ Trade approved — agent can proceed with execution");
    }

    runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    return JSON.stringify({
      reportId,
      verdict: verdictStr,
      navUsd6: report.navUsd6?.toString() || "0",
      exposureBps: report.postTradeExposureBps,
      slippageBps: report.slippageBps,
      reason: report.reason,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    runtime.log(`[ERROR] ${msg}`);
    runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    throw err;
  }
}
