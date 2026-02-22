import { createPublicClient, createWalletClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

// ===========================
// Deployed contract addresses (Base Sepolia)
// ===========================
export const ADDRESSES = {
  usdc: "0x241B2a5991Ee51c18DF255cE010B7ECc52B2AE1d" as const,
  weth: "0x71f58e4922B08322D8537B66E4310dE2C016F0b0" as const,
  stakeToken: "0x27AD216073378B2505Af70F01952BDA0Cc1bB202" as const,
  router: "0x89192bb10471a818036DA196e57912991D5a8bDe" as const,
  policy: "0xd2c81Bb6c6A348715fadA9Af7189191b2ec07c18" as const,
  registry: "0xdF3625C6D98081dcEc92003Fb40c5d131eebDc1F" as const,
  settlement: "0x9B8264A9dEB218FCee6829825534E9F744f25F56" as const,
  vault: "0x2D23c43301934F0d9AC6553A3E0A82096E40Cf6e" as const,
  agent: "0x2080d5Bf878E0dF355A8105D011518b4EbA15717" as const,
} as const;

export const EXPLORER = "https://base-sepolia.blockscout.com";

// ===========================
// ABIs (minimal for reads + writes)
// ===========================
export const POLICY_ABI = [
  {
    name: "constraints",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "vault", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "maxTradeNotionalUsd6", type: "uint256" },
          { name: "maxSlippageBps", type: "uint16" },
          { name: "maxPositionBps", type: "uint16" },
          { name: "cooldownSeconds", type: "uint32" },
          { name: "onlyAllowedAssets", type: "bool" },
          { name: "agentStakeRequired", type: "uint256" },
          { name: "slashBpsOnReject", type: "uint16" },
        ],
      },
    ],
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

export const REGISTRY_ABI = [
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

export const VAULT_ABI = [
  {
    name: "lastTradeTime",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "executeTrade",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
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
      { name: "reportId", type: "bytes32" },
      { name: "agent", type: "address" },
    ],
    outputs: [],
  },
] as const;

export const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const ROUTER_ABI = [
  {
    name: "price",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const SETTLEMENT_ABI = [
  {
    name: "onReport",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "report", type: "bytes" }],
    outputs: [],
  },
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
// Clients
// ===========================
export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

export function getWalletClient() {
  const key = process.env.AGENT_PRIVATE_KEY;
  if (!key) throw new Error("AGENT_PRIVATE_KEY not set");
  const account = privateKeyToAccount(key as `0x${string}`);
  return createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(),
  });
}
