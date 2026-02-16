// Praxion — Verifiable Agent Commerce Protocol
// Main workflow entry point

import { cre, Runner } from "@chainlink/cre-sdk";
import { onHttpTrigger, type Config } from "./agentCallback";

const initWorkflow = (config: Config) => {
  // Initialize HTTP capability for receiving agent requests
  const httpCapability = new cre.capabilities.HTTPCapability();
  const httpTrigger = httpCapability.trigger({});

  return [
    // HTTP Trigger: AI agents send requests with x402 payment proofs
    // → validate payment → execute service → settle onchain → return DON-signed result
    cre.handler(httpTrigger, onHttpTrigger),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}

main();
