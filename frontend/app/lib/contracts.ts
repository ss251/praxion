import { createPublicClient, createWalletClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

// ===========================
// Deployed contract addresses (Base Sepolia)
// ===========================
export const ADDRESSES = {
  usdc: "0x9989309119e6e41838d31dba30e97F09419B93b2" as const,
  weth: "0x2e746D6a2aEcF969F6523CE0A3D4BaC0e03C1F94" as const,
  stakeToken: "0x6FA90e131FfC8BCb7c940bD9a686a1f7C8CFE869" as const,
  router: "0x70670390143E80e2D93D8bb3787F675DeC3761a4" as const,
  policy: "0x6ec4e63cA2c98d3f1EE9Da812551f5241baDAD8d" as const,
  registry: "0xEAc52994285aD1508EC51D4E16EfaBBCB634587a" as const,
  settlement: "0x35184a00e25Aa983e8e76Ba68867461b8FEc7bfE" as const,
  vault: "0xF03035A13c29AAC87Bf3855A5dc54362e87126D5" as const,
  agent: "0x2080d5Bf878E0dF355A8105D011518b4EbA15717" as const,
  chainlinkEthUsd: "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1" as const,
  chainlinkUsdcUsd: "0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165" as const,
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
  {
    name: "priceRaw",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "answer", type: "int256" },
      { name: "feedDecimals", type: "uint8" },
      { name: "updatedAt", type: "uint256" },
    ],
  },
  {
    name: "priceFeed",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
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
