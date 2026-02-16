// agentCallback.ts — Main CRE callback: validates x402 payment, calls service, settles onchain

import {
  cre,
  type Runtime,
  type HTTPPayload,
  getNetwork,
  bytesToHex,
  hexToBase64,
  TxStatus,
  decodeJson,
  ok,
  consensusIdenticalAggregation,
  type HTTPSendRequester,
} from "@chainlink/cre-sdk";
import { encodeAbiParameters, parseAbiParameters, keccak256, toHex } from "viem";
import { parsePaymentHeader, validatePayment, paymentToSettlementFields, type AgentRequest, type AgentIntent, type X402PaymentProof } from "./x402";

// ===========================
// Config type
// ===========================

export type Config = {
  evms: Array<{
    settlementAddress: string;
    chainSelectorName: string;
    gasLimit: string;
  }>;
  serviceEndpoint: string;
};

// ===========================
// ABI encoding for settlement report
// ===========================

// Matches AgentGateSettlement._processReport expected encoding:
// (address agent, bytes32 serviceHash, uint256 paymentAmount, bytes32 resultHash)
const SETTLEMENT_PARAMS = parseAbiParameters(
  "address agent, bytes32 serviceHash, uint256 paymentAmount, bytes32 resultHash"
);

// ===========================
// Service execution types
// ===========================

interface ServiceResult {
  statusCode: number;
  data: string;
}

// Minimum payment: 100000 = 0.10 USDC (6 decimals)
const MINIMUM_PAYMENT = BigInt(100000);

// ===========================
// Main HTTP Trigger Callback
// ===========================

export function onHttpTrigger(runtime: Runtime<Config>, payload: HTTPPayload): string {
  runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  runtime.log("AgentGate × CRE: Verifiable Agent Commerce Protocol");
  runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    // ─────────────────────────────────────────────────────────────
    // Step 1: Parse incoming request from AI agent
    // ─────────────────────────────────────────────────────────────
    if (!payload.input || payload.input.length === 0) {
      runtime.log("[ERROR] Empty request payload");
      return "Error: Empty request";
    }

    const inputData = decodeJson(payload.input) as AgentRequest;
    runtime.log(`[Step 1] Agent request received`);

    // ─────────────────────────────────────────────────────────────
    // Step 2: Validate x402 payment proof
    // ─────────────────────────────────────────────────────────────
    runtime.log("[Step 2] Validating x402 payment...");

    const payment = inputData.payment;
    if (!payment || !payment.txHash || !payment.payer || !payment.amount) {
      runtime.log("[ERROR] Missing or invalid x402 payment proof");
      return "Error: Valid x402 payment required (HTTP 402)";
    }

    if (!validatePayment(runtime, payment, MINIMUM_PAYMENT)) {
      return "Error: Payment validation failed";
    }

    runtime.log(`[Step 2] ✓ Payment verified: ${payment.amount} from ${payment.payer}`);

    // ─────────────────────────────────────────────────────────────
    // Step 3: Parse agent intent and execute service
    // ─────────────────────────────────────────────────────────────
    const intent = inputData.intent;
    if (!intent || !intent.service) {
      runtime.log("[ERROR] Missing service intent");
      return "Error: Service intent required";
    }

    runtime.log(`[Step 3] Executing service: ${intent.service}`);

    const serviceResult = executeService(runtime, intent);
    runtime.log(`[Step 3] ✓ Service response: ${serviceResult.statusCode}`);

    // ─────────────────────────────────────────────────────────────
    // Step 4: Generate settlement report
    // ─────────────────────────────────────────────────────────────
    runtime.log("[Step 4] Generating DON-signed settlement report...");

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

    // Create hashes for on-chain storage
    const serviceHash = keccak256(toHex(intent.service));
    const resultHash = keccak256(toHex(serviceResult.data));
    const settlementFields = paymentToSettlementFields(payment);

    // ABI-encode the settlement data
    const reportData = encodeAbiParameters(SETTLEMENT_PARAMS, [
      settlementFields.agent,
      serviceHash,
      settlementFields.paymentAmount,
      resultHash,
    ]);

    // Generate DON-signed report
    const reportResponse = runtime
      .report({
        encodedPayload: hexToBase64(reportData),
        encoderName: "evm",
        signingAlgo: "ecdsa",
        hashingAlgo: "keccak256",
      })
      .result();

    // ─────────────────────────────────────────────────────────────
    // Step 5: Write settlement to smart contract
    // ─────────────────────────────────────────────────────────────
    runtime.log(`[Step 5] Writing settlement to: ${evmConfig.settlementAddress}`);

    const writeResult = evmClient
      .writeReport(runtime, {
        receiver: evmConfig.settlementAddress,
        report: reportResponse,
        gasConfig: {
          gasLimit: evmConfig.gasLimit,
        },
      })
      .result();

    // ─────────────────────────────────────────────────────────────
    // Step 6: Return DON-signed result to agent
    // ─────────────────────────────────────────────────────────────
    if (writeResult.txStatus === TxStatus.SUCCESS) {
      const txHash = bytesToHex(writeResult.txHash || new Uint8Array(32));
      runtime.log(`[Step 6] ✓ Settlement tx: ${txHash}`);
      runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      // Return the service result + settlement proof to the agent
      return JSON.stringify({
        result: serviceResult.data,
        settlement: {
          txHash,
          serviceHash,
          resultHash,
        },
      });
    }

    throw new Error(`Settlement tx failed: ${writeResult.txStatus}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    runtime.log(`[ERROR] ${msg}`);
    runtime.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    throw err;
  }
}

// ===========================
// Service execution via HTTP
// ===========================

/**
 * Executes the requested service via CRE's HTTP capability with DON consensus.
 * Uses the same pattern as the bootcamp's Gemini integration.
 */
function executeService(runtime: Runtime<Config>, intent: AgentIntent): ServiceResult {
  const httpClient = new cre.capabilities.HTTPClient();

  const result = httpClient
    .sendRequest(
      runtime,
      buildServiceRequest(intent),
      consensusIdenticalAggregation<ServiceResult>()
    )(runtime.config)
    .result();

  return result;
}

/**
 * Builds the HTTP request for the requested service.
 * Currently supports price-feed queries via CoinGecko.
 */
const buildServiceRequest =
  (intent: AgentIntent) =>
  (sendRequester: HTTPSendRequester, config: Config): ServiceResult => {
    let url: string;
    let method: "GET" | "POST" = "GET";
    let body: string | undefined;

    switch (intent.service) {
      case "price-feed": {
        // Fetch crypto price data
        const coin = intent.params.coin || "bitcoin";
        const currency = intent.params.currency || "usd";
        url = `${config.serviceEndpoint}/simple/price?ids=${coin}&vs_currencies=${currency}`;
        break;
      }
      case "market-data": {
        const coin = intent.params.coin || "bitcoin";
        url = `${config.serviceEndpoint}/coins/${coin}?localization=false&tickers=false&community_data=false&developer_data=false`;
        break;
      }
      default: {
        // Generic HTTP service call — agent provides the URL
        url = intent.params.url || `${config.serviceEndpoint}`;
        method = (intent.params.method as "GET" | "POST") || "GET";
        body = intent.params.body;
        break;
      }
    }

    const req: Parameters<typeof sendRequester.sendRequest>[0] = {
      url,
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      cacheSettings: {
        store: true,
        maxAge: "30s",
      },
    };

    if (body) {
      req.body = Buffer.from(new TextEncoder().encode(body)).toString("base64");
    }

    const resp = sendRequester.sendRequest(req).result();
    const bodyText = new TextDecoder().decode(resp.body);

    if (!ok(resp)) {
      throw new Error(`Service error: ${resp.statusCode} - ${bodyText}`);
    }

    return {
      statusCode: resp.statusCode,
      data: bodyText,
    };
  };
