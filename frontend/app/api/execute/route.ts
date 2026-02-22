import { NextResponse } from "next/server";
import {
  publicClient,
  getWalletClient,
  ADDRESSES,
  VAULT_ABI,
  SETTLEMENT_ABI,
  ERC20_ABI,
} from "../../lib/contracts";

export async function POST(req: Request) {
  try {
    const { reportId, sellAmount, minBuyAmount, deadline } = await req.json();

    // 1. Verify report exists on-chain and is APPROVE
    const report = await publicClient.readContract({
      address: ADDRESSES.settlement,
      abi: SETTLEMENT_ABI,
      functionName: "getReport",
      args: [reportId as `0x${string}`],
    });

    if (!report.exists) {
      return NextResponse.json(
        { error: "Report not found on-chain" },
        { status: 400 }
      );
    }

    if (Number(report.verdict) !== 0) {
      return NextResponse.json(
        { error: "Report verdict is REJECT — execution blocked" },
        { status: 400 }
      );
    }

    // 2. Read pre-trade balances
    const preUsdc = await publicClient.readContract({
      address: ADDRESSES.usdc,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [ADDRESSES.vault],
    });

    const preWeth = await publicClient.readContract({
      address: ADDRESSES.weth,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [ADDRESSES.vault],
    });

    // 3. Execute trade via vault
    const walletClient = getWalletClient();

    const txHash = await walletClient.writeContract({
      address: ADDRESSES.vault,
      abi: VAULT_ABI,
      functionName: "executeTrade",
      args: [
        {
          sellToken: ADDRESSES.usdc,
          buyToken: ADDRESSES.weth,
          sellAmount: BigInt(sellAmount),
          minBuyAmount: BigInt(minBuyAmount),
          deadline: BigInt(deadline),
        },
        reportId as `0x${string}`,
        ADDRESSES.agent,
      ],
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    // 4. Read post-trade balances
    const postUsdc = await publicClient.readContract({
      address: ADDRESSES.usdc,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [ADDRESSES.vault],
    });

    const postWeth = await publicClient.readContract({
      address: ADDRESSES.weth,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [ADDRESSES.vault],
    });

    return NextResponse.json({
      txHash,
      blockNumber: Number(receipt.blockNumber),
      gasUsed: Number(receipt.gasUsed),
      status: receipt.status,
      balanceChanges: {
        usdc: {
          before: preUsdc.toString(),
          after: postUsdc.toString(),
          delta: (postUsdc - preUsdc).toString(),
        },
        weth: {
          before: preWeth.toString(),
          after: postWeth.toString(),
          delta: (postWeth - preWeth).toString(),
        },
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Execute error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
