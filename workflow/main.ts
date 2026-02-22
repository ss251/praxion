// Praxion v2 — CRE Workflow: Cryptographically Constrained AI Trade Evaluation
// The CRE workflow acts as the "execution court" — evaluating agent trade proposals
// against on-chain policy constraints and writing APPROVE/REJECT verdicts.
//
// Triggers:
//   1. HTTP Trigger — AI agent submits a trade proposal for evaluation
//   2. Log Trigger — Monitors ReportStored events for post-verdict analysis

import { cre, Runner, getNetwork } from "@chainlink/cre-sdk";
import { keccak256, toHex } from "viem";
import { onHttpTrigger, type Config } from "./tradeEvalCallback";
import { onReportStoredLog } from "./reportMonitorCallback";

// Event signature for monitoring settlement verdicts
const REPORT_STORED_SIGNATURE = "ReportStored(bytes32,uint8,address,address)";

const initWorkflow = (config: Config) => {
  // ── Trigger 1: HTTP — Trade proposal evaluation ──
  const httpCapability = new cre.capabilities.HTTPCapability();
  const httpTrigger = httpCapability.trigger({});

  // ── Trigger 2: Log — Monitor on-chain verdict events ──
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.evms[0].chainSelectorName,
    isTestnet: true,
  });

  if (!network) {
    throw new Error(`Network not found: ${config.evms[0].chainSelectorName}`);
  }

  const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector);
  const eventHash = keccak256(toHex(REPORT_STORED_SIGNATURE));

  return [
    // Primary: AI agent sends trade proposal → CRE evaluates → APPROVE/REJECT
    cre.handler(httpTrigger, onHttpTrigger),

    // Secondary: Monitor ReportStored events for analytics/alerting
    cre.handler(
      evmClient.logTrigger({
        addresses: [config.evms[0].settlementAddress],
        topics: [{ values: [eventHash] }],
        confidence: "CONFIDENCE_LEVEL_FINALIZED",
      }),
      onReportStoredLog
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}

main();
