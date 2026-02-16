// Praxion v2 — CRE Workflow: Cryptographically Constrained AI Trade Evaluation
// The CRE workflow acts as the "execution court" — evaluating agent trade proposals
// against on-chain policy constraints and writing APPROVE/REJECT verdicts.

import { cre, Runner } from "@chainlink/cre-sdk";
import { onHttpTrigger, type Config } from "./tradeEvalCallback";

const initWorkflow = (config: Config) => {
  // HTTP trigger: receives trade proposals from AI agents
  const httpCapability = new cre.capabilities.HTTPCapability();
  const httpTrigger = httpCapability.trigger({});

  return [
    cre.handler(httpTrigger, onHttpTrigger),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}

main();
