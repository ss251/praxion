"use client";

import { useState, useEffect, useCallback } from "react";

// ===========================
// Types
// ===========================
interface OnChainState {
  policy: {
    maxTradeNotionalUsd6: string;
    maxSlippageBps: number;
    maxPositionBps: number;
    cooldownSeconds: number;
    onlyAllowedAssets: boolean;
    agentStakeRequired: string;
    slashBpsOnReject: number;
  };
  agent: {
    address: string;
    isActive: boolean;
    stake: string;
    lastTradeTime: string;
  };
  vault: {
    address: string;
    usdcBalance: string;
    wethBalance: string;
    totalShares: string;
    agentShares: string;
  };
  router: {
    address: string;
    price: number;
  };
  addresses: Record<string, string>;
}

interface EvalResult {
  reportId: string;
  verdict: "APPROVE" | "REJECT";
  reason: string;
  txHash: string;
  blockNumber: number;
  gasUsed: number;
  steps: string[];
  details: {
    navUsd6: string;
    postTradeExposureBps: number;
    expectedPriceUsd6: string;
    slippageBps: number;
    agentStake: string;
    tradeNotionalUsd6: string;
    priceSources: {
      coinGecko: number;
      coinPaprika: number;
      consensus: number;
    };
  };
  intent: {
    sellToken: string;
    buyToken: string;
    sellAmount: string;
    minBuyAmount: string;
    deadline: string;
  };
}

interface ExecResult {
  txHash: string;
  blockNumber: number;
  gasUsed: number;
  status: string;
  balanceChanges: {
    usdc: { before: string; after: string; delta: string };
    weth: { before: string; after: string; delta: string };
  };
}

interface ActivityItem {
  time: string;
  event: string;
  detail: string;
  type: "approve" | "reject" | "slash" | "execute" | "info" | "chain";
}

const EXPLORER = "https://base-sepolia.blockscout.com";

// ===========================
// Helpers
// ===========================
function formatUsd6(val: string): string {
  return `$${(Number(val) / 1e6).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatWeth(val: string): string {
  return `${(Number(val) / 1e18).toFixed(4)} WETH`;
}

function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

function formatStake(val: string): string {
  return `${(Number(val) / 1e18).toLocaleString()} pxSTK`;
}

function shortHash(h: string): string {
  return `${h.slice(0, 6)}…${h.slice(-4)}`;
}

function now(): string {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

// ===========================
// Component
// ===========================
export default function Dashboard() {
  const [state, setState] = useState<OnChainState | null>(null);
  const [loading, setLoading] = useState(true);
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [execResult, setExecResult] = useState<ExecResult | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [currentStep, setCurrentStep] = useState("");
  const [evalSteps, setEvalSteps] = useState<string[]>([]);

  // Fetch on-chain state
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/state");
      const data = await res.json();
      if (!data.error) setState(data);
    } catch (e) {
      console.error("Failed to fetch state:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Propose trade (hits real chain)
  const proposeTrade = async (amount: number) => {
    setProcessing(true);
    setEvalResult(null);
    setExecResult(null);
    setEvalSteps([]);
    setCurrentStep("Submitting trade proposal to CRE...");

    const sellAmount = String(amount * 1e6); // USDC 6 decimals

    // minBuyAmount: safety floor for the on-chain swap based on router's actual price
    // CRE evaluates slippage via oracle source divergence (not minBuyAmount vs price)
    const routerRate = state?.router?.price || 1960;
    const minBuyAmount = String(
      BigInt(Math.floor((amount / routerRate) * 0.95 * 1e18))
    );
    const deadline = String(Math.floor(Date.now() / 1000) + 600); // 10 min

    setActivity((prev) => [
      {
        time: now(),
        event: "TradeProposed",
        detail: `BUY $${amount.toLocaleString()} WETH submitted to CRE`,
        type: "info",
      },
      ...prev,
    ]);

    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellAmount, minBuyAmount, deadline }),
      });
      const data = await res.json();

      if (data.error) {
        setCurrentStep(`Error: ${data.error}`);
        setProcessing(false);
        return;
      }

      setEvalResult(data);
      setEvalSteps(data.steps || []);

      setActivity((prev) => [
        {
          time: now(),
          event: "ReportWritten",
          detail: `Tx: ${shortHash(data.txHash)} (block ${data.blockNumber})`,
          type: "chain",
        },
        {
          time: now(),
          event: data.verdict === "APPROVE" ? "CRE_APPROVED" : "CRE_REJECTED",
          detail: data.reason.substring(0, 80),
          type: data.verdict === "APPROVE" ? "approve" : "reject",
        },
        ...(data.verdict === "REJECT"
          ? [
              {
                time: now(),
                event: "StakeSlashed",
                detail: `Agent stake reduced to ${formatStake(data.details.agentStake)}`,
                type: "slash" as const,
              },
            ]
          : []),
        ...prev,
      ]);

      // Refresh on-chain state
      await fetchState();
    } catch (e) {
      setCurrentStep(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }

    setProcessing(false);
    setCurrentStep("");
  };

  // Execute approved trade
  const executeTrade = async () => {
    if (!evalResult || evalResult.verdict !== "APPROVE") return;
    setExecuting(true);

    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: evalResult.reportId,
          sellAmount: evalResult.intent.sellAmount,
          minBuyAmount: evalResult.intent.minBuyAmount,
          deadline: evalResult.intent.deadline,
        }),
      });
      const data = await res.json();

      if (data.error) {
        setActivity((prev) => [
          {
            time: now(),
            event: "ExecutionFailed",
            detail: data.error.substring(0, 80),
            type: "reject",
          },
          ...prev,
        ]);
        setExecuting(false);
        return;
      }

      setExecResult(data);

      setActivity((prev) => [
        {
          time: now(),
          event: "SwapCompleted",
          detail: `USDC ${formatUsd6(data.balanceChanges.usdc.delta)} → WETH ${formatWeth(data.balanceChanges.weth.delta)}`,
          type: "execute",
        },
        {
          time: now(),
          event: "TradeExecuted",
          detail: `Tx: ${shortHash(data.txHash)} (block ${data.blockNumber})`,
          type: "chain",
        },
        ...prev,
      ]);

      // Refresh state
      await fetchState();
    } catch (e) {
      console.error("Execute error:", e);
    }

    setExecuting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <span className="w-5 h-5 border-2 border-chainlink border-t-transparent rounded-full animate-spin" />
          Loading on-chain state from Base Sepolia...
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-400">
        Failed to load on-chain state. Check RPC connection.
      </div>
    );
  }

  const navUsd = Number(state.vault.usdcBalance) / 1e6;
  const wethUsd = (Number(state.vault.wethBalance) / 1e18) * (state.router?.price || 1960);
  const totalNav = navUsd + wethUsd;
  const wethExposureBps = totalNav > 0 ? Math.round((wethUsd / totalNav) * 10000) : 0;

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">Trade Evaluation Dashboard</h1>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Base Sepolia
          </span>
        </div>
        <p className="text-foreground/50">
          Live on-chain state • CRE-enforced policy constraints • Real transactions
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        <StatCard label="Vault USDC" value={formatUsd6(state.vault.usdcBalance)} />
        <StatCard label="Vault WETH" value={formatWeth(state.vault.wethBalance)} />
        <StatCard label="WETH Exposure" value={formatBps(wethExposureBps)} />
        <StatCard label="Agent Stake" value={formatStake(state.agent.stake)} />
        <StatCard
          label="Agent Status"
          value={state.agent.isActive ? "Active ✓" : "Inactive ✗"}
          highlight={state.agent.isActive}
          warn={!state.agent.isActive}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Policy + Trade + Verdict */}
        <div className="lg:col-span-2 space-y-6">
          {/* Policy (from chain) */}
          <div className="bg-card border border-card-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">On-chain Policy Constraints</h2>
              <a
                href={`${EXPLORER}/address/${state.addresses.policy}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-chainlink hover:underline font-mono"
              >
                {shortHash(state.addresses.policy)} ↗
              </a>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <PolicyField label="Max Trade" value={formatUsd6(state.policy.maxTradeNotionalUsd6)} />
              <PolicyField label="Max Slippage" value={formatBps(state.policy.maxSlippageBps)} />
              <PolicyField label="Max Position" value={formatBps(state.policy.maxPositionBps)} />
              <PolicyField label="Cooldown" value={`${state.policy.cooldownSeconds}s`} />
              <PolicyField label="Min Agent Stake" value={formatStake(state.policy.agentStakeRequired)} />
              <PolicyField label="Slash on Reject" value={formatBps(state.policy.slashBpsOnReject)} />
            </div>
          </div>

          {/* Trade Proposals */}
          <div className="bg-card border border-card-border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Propose Trade</h2>
            <p className="text-sm text-foreground/40 mb-4">
              Proposals are evaluated against on-chain policy by simulated CRE DON workflow. Verdicts are written to PraxionSettlement on Base Sepolia.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <TradeButton
                label="BUY $1,000 WETH"
                description="Within all policy limits"
                amount={1000}
                variant="good"
                onClick={() => proposeTrade(1000)}
                disabled={processing}
              />
              <TradeButton
                label="BUY $60,000 WETH"
                description="Violates max trade ($50K) and max exposure (30%)"
                amount={60000}
                variant="bad"
                onClick={() => proposeTrade(60000)}
                disabled={processing}
              />
            </div>
            {processing && (
              <div className="mt-4 p-4 bg-background border border-card-border rounded-lg">
                <div className="flex items-center gap-3 text-sm text-chainlink mb-3">
                  <span className="w-4 h-4 border-2 border-chainlink border-t-transparent rounded-full animate-spin" />
                  {currentStep || "CRE DON evaluating trade proposal..."}
                </div>
                {evalSteps.length > 0 && (
                  <div className="space-y-1 text-xs font-mono text-foreground/50 max-h-[200px] overflow-y-auto">
                    {evalSteps.map((s, i) => (
                      <div key={i}>{s}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Verdict */}
          {evalResult && (
            <div
              className={`border rounded-xl p-6 ${
                evalResult.verdict === "APPROVE"
                  ? "bg-green-500/5 border-green-500/30"
                  : "bg-red-500/5 border-red-500/30"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">CRE Verdict</h2>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-bold ${
                    evalResult.verdict === "APPROVE"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {evalResult.verdict}
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-foreground/50">Reason:</span>{" "}
                  <span className="font-mono">{evalResult.reason}</span>
                </div>
                <div>
                  <span className="text-foreground/50">Report ID:</span>{" "}
                  <span className="font-mono text-xs">{evalResult.reportId}</span>
                </div>
                <div>
                  <span className="text-foreground/50">Settlement Tx:</span>{" "}
                  <a
                    href={`${EXPLORER}/tx/${evalResult.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-chainlink hover:underline"
                  >
                    {evalResult.txHash} ↗
                  </a>
                </div>
                <div className="text-xs text-foreground/40">
                  Block {evalResult.blockNumber} · Gas {evalResult.gasUsed.toLocaleString()}
                </div>

                {/* Price sources */}
                {evalResult.details.priceSources && (
                  <div className="mt-3 pt-3 border-t border-card-border/50">
                    <div className="text-xs text-foreground/40 mb-2">DON Price Consensus (2 sources)</div>
                    <div className="grid grid-cols-3 gap-3">
                      <MiniStat
                        label="CoinGecko"
                        value={`$${evalResult.details.priceSources.coinGecko.toFixed(2)}`}
                      />
                      <MiniStat
                        label="CoinPaprika"
                        value={`$${evalResult.details.priceSources.coinPaprika.toFixed(2)}`}
                      />
                      <MiniStat
                        label="Consensus"
                        value={`$${evalResult.details.priceSources.consensus.toFixed(2)}`}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-card-border/50">
                  <MiniStat
                    label="Post-trade Exposure"
                    value={formatBps(evalResult.details.postTradeExposureBps)}
                    warn={evalResult.details.postTradeExposureBps > state.policy.maxPositionBps}
                  />
                  <MiniStat
                    label="Slippage"
                    value={formatBps(evalResult.details.slippageBps)}
                    warn={evalResult.details.slippageBps > state.policy.maxSlippageBps}
                  />
                  <MiniStat
                    label="Trade Notional"
                    value={formatUsd6(evalResult.details.tradeNotionalUsd6)}
                    warn={
                      Number(evalResult.details.tradeNotionalUsd6) >
                      Number(state.policy.maxTradeNotionalUsd6)
                    }
                  />
                  <MiniStat
                    label="ETH Price"
                    value={`$${(Number(evalResult.details.expectedPriceUsd6) / 1e6).toFixed(2)}`}
                  />
                </div>
              </div>

              {/* Execute / Blocked */}
              <div className="mt-4">
                <button
                  onClick={executeTrade}
                  disabled={evalResult.verdict !== "APPROVE" || executing}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    evalResult.verdict === "APPROVE"
                      ? "bg-green-500 hover:bg-green-400 text-black cursor-pointer"
                      : "bg-foreground/10 text-foreground/30 cursor-not-allowed"
                  }`}
                >
                  {executing
                    ? "Executing on-chain..."
                    : evalResult.verdict === "APPROVE"
                    ? "Execute Trade via PraxionVault →"
                    : "Execution Blocked (REJECTED)"}
                </button>
                {evalResult.verdict === "REJECT" && (
                  <p className="text-xs text-red-400/70 mt-2">
                    ⚠ Agent stake slashed: {formatBps(state.policy.slashBpsOnReject)} penalty applied on-chain
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Execution Result */}
          {execResult && (
            <div className="bg-chainlink/5 border border-chainlink/30 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 text-chainlink">
                ✓ Trade Executed On-chain
              </h2>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-foreground/50">Vault Tx:</span>{" "}
                  <a
                    href={`${EXPLORER}/tx/${execResult.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-chainlink hover:underline"
                  >
                    {execResult.txHash} ↗
                  </a>
                </div>
                <div className="text-xs text-foreground/40">
                  Block {execResult.blockNumber} · Gas {execResult.gasUsed.toLocaleString()}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-card-border/50">
                  <div className="bg-background border border-card-border rounded-lg p-4">
                    <div className="text-xs text-foreground/40 mb-2">USDC Balance Change</div>
                    <div className="font-mono">
                      <div className="text-foreground/60">{formatUsd6(execResult.balanceChanges.usdc.before)}</div>
                      <div className="text-red-400">→ {formatUsd6(execResult.balanceChanges.usdc.after)}</div>
                      <div className="text-xs mt-1 text-red-400/70">{formatUsd6(execResult.balanceChanges.usdc.delta)}</div>
                    </div>
                  </div>
                  <div className="bg-background border border-card-border rounded-lg p-4">
                    <div className="text-xs text-foreground/40 mb-2">WETH Balance Change</div>
                    <div className="font-mono">
                      <div className="text-foreground/60">{formatWeth(execResult.balanceChanges.weth.before)}</div>
                      <div className="text-green-400">→ {formatWeth(execResult.balanceChanges.weth.after)}</div>
                      <div className="text-xs mt-1 text-green-400/70">+{formatWeth(execResult.balanceChanges.weth.delta)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CRE Evaluation Log */}
          {evalSteps.length > 0 && !processing && (
            <div className="bg-card border border-card-border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">CRE Evaluation Log</h2>
              <div className="bg-background border border-card-border rounded-lg p-4 max-h-[400px] overflow-y-auto">
                <div className="space-y-1 text-xs font-mono text-foreground/60">
                  {evalSteps.map((s, i) => (
                    <div
                      key={i}
                      className={
                        s.startsWith("✓")
                          ? "text-green-400"
                          : s.startsWith("✗")
                          ? "text-red-400"
                          : s.startsWith("⚠")
                          ? "text-orange-400"
                          : s.startsWith("→")
                          ? "text-chainlink font-bold"
                          : ""
                      }
                    >
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Activity + Contracts */}
        <div className="space-y-6">
          {/* Activity Feed */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Activity Feed</h2>
            <div className="bg-card border border-card-border rounded-xl p-4 max-h-[500px] overflow-y-auto">
              {activity.length === 0 ? (
                <p className="text-sm text-foreground/30 text-center py-8">
                  Propose a trade to see on-chain activity
                </p>
              ) : (
                <div className="space-y-3">
                  {activity.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 pb-3 border-b border-card-border/50 last:border-0 last:pb-0"
                    >
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          a.type === "approve"
                            ? "bg-green-500"
                            : a.type === "reject"
                            ? "bg-red-500"
                            : a.type === "slash"
                            ? "bg-orange-500"
                            : a.type === "execute"
                            ? "bg-chainlink"
                            : a.type === "chain"
                            ? "bg-blue-500"
                            : "bg-foreground/30"
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-medium">{a.event}</div>
                        <div className="text-xs text-foreground/50 break-all">
                          {a.detail}
                        </div>
                        <div className="text-xs text-foreground/30 font-mono mt-0.5">
                          {a.time}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Deployed Contracts */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Deployed Contracts</h2>
            <div className="bg-card border border-card-border rounded-xl p-4 space-y-3">
              {[
                { name: "PraxionVault", addr: state.addresses.vault },
                { name: "PraxionPolicy", addr: state.addresses.policy },
                { name: "PraxionSettlement", addr: state.addresses.settlement },
                { name: "PraxionRegistry", addr: state.addresses.registry },
                { name: "USDC (Mock)", addr: state.addresses.usdc },
                { name: "WETH (Mock)", addr: state.addresses.weth },
              ].map((c) => (
                <div key={c.name} className="flex items-center justify-between">
                  <span className="text-sm">{c.name}</span>
                  <a
                    href={`${EXPLORER}/address/${c.addr}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-chainlink hover:underline font-mono"
                  >
                    {shortHash(c.addr)} ↗
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* CRE Workflow */}
          <div>
            <h2 className="text-lg font-semibold mb-4">CRE Workflow</h2>
            <div className="bg-card border border-card-border rounded-xl p-4 space-y-4">
              <StatusRow label="Network" value="Base Sepolia (84532)" />
              <StatusRow label="CRE Workflow" value="Active" active />
              <StatusRow label="DON Consensus" value="2 Sources" active />
              <StatusRow label="Price Feed 1" value="CoinGecko" />
              <StatusRow label="Price Feed 2" value="CoinPaprika" />
              <StatusRow
                label="Forwarder"
                value={shortHash(state.agent.address)}
                mono
              />
            </div>
          </div>

          {/* Flow */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Execution Flow</h2>
            <div className="bg-card border border-card-border rounded-xl p-4 text-xs font-mono text-foreground/60 space-y-2">
              <div>1. Agent proposes trade</div>
              <div className="pl-2 text-chainlink">↓ HTTP trigger → CRE</div>
              <div>2. CRE reads PraxionPolicy from chain</div>
              <div className="pl-2 text-chainlink">↓ EVM read</div>
              <div>3. CRE fetches ETH price (2 sources)</div>
              <div className="pl-2 text-chainlink">↓ DON consensus</div>
              <div>4. Evaluate all constraints</div>
              <div className="pl-2 text-chainlink">↓ verdict generated</div>
              <div>5. Write APPROVE/REJECT to Settlement</div>
              <div className="pl-2 text-chainlink">↓ on-chain tx</div>
              <div>6. Vault executes (only if APPROVE)</div>
              <div className="pl-2 text-chainlink">↓ swap via router</div>
              <div>7. If REJECT → agent stake slashed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================
// Sub-components
// ===========================

function StatCard({
  label,
  value,
  highlight,
  warn,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5">
      <div className="text-foreground/50 text-sm mb-1">{label}</div>
      <div
        className={`text-xl font-bold ${
          warn ? "text-red-400" : highlight ? "text-green-400" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function PolicyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-foreground/40 text-xs mb-0.5">{label}</div>
      <div className="font-mono text-sm">{value}</div>
    </div>
  );
}

function TradeButton({
  label,
  description,
  amount,
  variant,
  onClick,
  disabled,
}: {
  label: string;
  description: string;
  amount: number;
  variant: "good" | "bad";
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-4 rounded-lg border text-left transition-all hover:scale-[1.01] active:scale-[0.99] ${
        variant === "good"
          ? "border-green-500/30 hover:border-green-500/60 bg-green-500/5"
          : "border-red-500/30 hover:border-red-500/60 bg-red-500/5"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div className="font-semibold mb-1">{label}</div>
      <div className="text-xs text-foreground/50">USDC → WETH · ${amount.toLocaleString()}</div>
      <div className="text-xs text-foreground/40 mt-1">{description}</div>
      <div
        className={`text-xs mt-2 font-medium ${
          variant === "good" ? "text-green-400" : "text-red-400"
        }`}
      >
        {variant === "good" ? "✓ Should APPROVE" : "✗ Should REJECT"}
      </div>
    </button>
  );
}

function MiniStat({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div>
      <div className="text-foreground/40 text-xs">{label}</div>
      <div className={`font-mono text-sm ${warn ? "text-red-400" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function StatusRow({
  label,
  value,
  active,
  mono,
}: {
  label: string;
  value: string;
  active?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      {active ? (
        <span className="flex items-center gap-2 text-xs text-green-400">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          {value}
        </span>
      ) : (
        <span className={`text-xs text-foreground/50 ${mono ? "font-mono" : ""}`}>
          {value}
        </span>
      )}
    </div>
  );
}
