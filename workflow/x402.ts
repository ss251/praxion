// x402.ts — x402 Payment Required protocol helpers
// See https://www.x402.org/ for the standard

import { type Runtime } from "@chainlink/cre-sdk";

/**
 * x402 Payment Proof parsed from HTTP headers.
 * 
 * The x402 standard uses HTTP 402 Payment Required responses to negotiate
 * payment. When an agent pays, it includes a payment proof in the
 * X-PAYMENT header of the subsequent request.
 */
export interface X402PaymentProof {
  /** The payment network (e.g., "base-sepolia", "ethereum-sepolia") */
  network: string;
  /** Transaction hash of the payment */
  txHash: string;
  /** Token used for payment (e.g., USDC address) */
  token: string;
  /** Payment amount in token's smallest unit */
  amount: string;
  /** Address of the paying agent */
  payer: string;
  /** Address of the service provider / payee */
  payee: string;
  /** Timestamp when payment was made */
  timestamp: number;
}

/**
 * Agent intent parsed from the request body.
 */
export interface AgentIntent {
  /** The service being requested (e.g., "price-feed", "llm-query") */
  service: string;
  /** Parameters for the service call */
  params: Record<string, string>;
  /** The agent's return address for the response */
  callbackUrl?: string;
}

/**
 * Full parsed request from an AI agent.
 */
export interface AgentRequest {
  payment: X402PaymentProof;
  intent: AgentIntent;
}

/**
 * Parse the X-PAYMENT header containing a base64-encoded JSON payment proof.
 * Returns null if the header is missing or malformed.
 */
export function parsePaymentHeader(paymentHeader: string | undefined): X402PaymentProof | null {
  if (!paymentHeader) return null;

  try {
    const decoded = Buffer.from(paymentHeader, "base64").toString("utf-8");
    const proof = JSON.parse(decoded) as X402PaymentProof;

    // Validate required fields
    if (!proof.txHash || !proof.payer || !proof.amount || !proof.payee) {
      return null;
    }

    return proof;
  } catch {
    return null;
  }
}

/**
 * Validate that a payment proof meets minimum requirements for a service.
 */
export function validatePayment(
  runtime: Runtime<unknown>,
  proof: X402PaymentProof,
  minimumAmount: bigint
): boolean {
  // Check amount meets minimum
  const paymentAmount = BigInt(proof.amount);
  if (paymentAmount < minimumAmount) {
    runtime.log(`[x402] Payment too low: ${proof.amount} < ${minimumAmount.toString()}`);
    return false;
  }

  // Check timestamp is recent (within 1 hour)
  const now = Math.floor(Date.now() / 1000);
  const oneHour = 3600;
  if (proof.timestamp < now - oneHour) {
    runtime.log(`[x402] Payment too old: ${proof.timestamp}`);
    return false;
  }

  runtime.log(`[x402] Payment validated: ${proof.amount} from ${proof.payer}`);
  return true;
}

/**
 * Encode payment proof for inclusion in on-chain settlement.
 * Returns the fields needed for the AgentGateSettlement contract.
 */
export function paymentToSettlementFields(proof: X402PaymentProof) {
  return {
    agent: proof.payer as `0x${string}`,
    paymentAmount: BigInt(proof.amount),
    paymentTxHash: proof.txHash as `0x${string}`,
  };
}
