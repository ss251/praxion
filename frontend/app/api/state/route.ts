import { NextResponse } from "next/server";
import {
  publicClient,
  ADDRESSES,
  POLICY_ABI,
  REGISTRY_ABI,
  VAULT_ABI,
  ERC20_ABI,
  ROUTER_ABI,
} from "../../lib/contracts";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [
      constraints,
      isActive,
      agentStake,
      lastTradeTime,
      vaultUsdcBalance,
      vaultWethBalance,
      totalShares,
      agentShares,
      routerPrice,
      routerPriceRaw,
    ] = await Promise.all([
      publicClient.readContract({
        address: ADDRESSES.policy,
        abi: POLICY_ABI,
        functionName: "constraints",
        args: [ADDRESSES.vault],
      }),
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
      publicClient.readContract({
        address: ADDRESSES.vault,
        abi: VAULT_ABI,
        functionName: "totalSupply",
      }),
      publicClient.readContract({
        address: ADDRESSES.vault,
        abi: VAULT_ABI,
        functionName: "balanceOf",
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

    return NextResponse.json({
      policy: {
        maxTradeNotionalUsd6: constraints.maxTradeNotionalUsd6.toString(),
        maxSlippageBps: Number(constraints.maxSlippageBps),
        maxPositionBps: Number(constraints.maxPositionBps),
        cooldownSeconds: Number(constraints.cooldownSeconds),
        onlyAllowedAssets: constraints.onlyAllowedAssets,
        agentStakeRequired: constraints.agentStakeRequired.toString(),
        slashBpsOnReject: Number(constraints.slashBpsOnReject),
      },
      agent: {
        address: ADDRESSES.agent,
        isActive,
        stake: agentStake.toString(),
        lastTradeTime: lastTradeTime.toString(),
      },
      vault: {
        address: ADDRESSES.vault,
        usdcBalance: vaultUsdcBalance.toString(),
        wethBalance: vaultWethBalance.toString(),
        totalShares: totalShares.toString(),
        agentShares: agentShares.toString(),
      },
      router: {
        address: ADDRESSES.router,
        price: Number(routerPrice),
        chainlinkFeed: ADDRESSES.chainlinkEthUsd,
        chainlinkPriceRaw: routerPriceRaw[0].toString(),
        chainlinkDecimals: Number(routerPriceRaw[1]),
        chainlinkPrice: Number(routerPriceRaw[0]) / (10 ** Number(routerPriceRaw[1])),
        chainlinkUpdatedAt: new Date(Number(routerPriceRaw[2]) * 1000).toISOString(),
      },
      addresses: ADDRESSES,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("State error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
