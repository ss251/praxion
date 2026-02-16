"use client";

import { useState } from "react";

// ===========================
// Mock data matching architecture
// ===========================
const MOCK_POLICY = {
  maxTradeNotionalUsd6: "1000000000", // $1,000
  maxSlippageBps: 50, // 0.50%
  maxPositionBps: 3000, // 30%
  cooldownSeconds: 60,
  onlyAllowedAssets: true,
  allowedAssets: ["WETH"],
  agentStakeRequired: "500000000", // 500 USDC
  slashBpsOnReject: 500, // 5%
};

const MOCK_VAULT = {
  navUsd6: "10000000000", // $10,000
  usdcBalance: "10000000000",
  wethBalance: "0",
  wethExposureBps: 0,
};

const MOCK_AGENT = {
  address: "0x2080d5Bf878E0dF355A8105D011518b4EbA15717",
  staked: "500000000", // 500 USDC
  active: true,
  lastTradeTime: 0,
};

// Good trade: $1,000 WETH buy (within all limits)
const GOOD_TRADE = {
  label: "BUY $1,000 WETH",
  sellToken: "USDC",
  buyToken: "WETH",
  sellAmount: "1000000000", // $1,000
  minBuyAmount: "330000000000000000", // ~0.33 WETH
  notionalUsd: 1000,
  description: "Within all policy limits",
};

// Bad trade: $8,000 WETH buy (violates exposure + notional)
const BAD_TRADE = {
  label: "BUY $8,000 WETH",
  sellToken: "USDC",
  buyToken: "WETH",
  sellAmount: "8000000000", // $8,000
  minBuyAmount: "2640000000000000000", // ~2.64 WETH
  notionalUsd: 8000,
  description: "Violates max trade ($1K) and max exposure (30%)",
};

type Verdict = {
  reportId: string;
  verdict: "APPROVE" | "REJECT";
  reason: string;
  txHash: string;
  details: {
    navUsd6: string;
    postTradeExposureBps: number;
    expectedPriceUsd6: string;
    slippageBps: number;
    tradeNotionalUsd6: string;
    agentStake: string;
  };
};

type ActivityItem = {
  time: string;
  event: string;
  detail: string;
  type: "approve" | "reject" | "slash" | "execute" | "info";
};

function formatUsd6(val: string): string {
  return `$${(Number(val) / 1e6).toLocaleString()}`;
}

function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

// Simulated CRE evaluation
function evaluateTrade(
  trade: typeof GOOD_TRADE,
  policy: typeof MOCK_POLICY,
  vault: typeof MOCK_VAULT,
  agent: typeof MOCK_AGENT
): Verdict {
  const reasons: string[] = [];
  const tradeNotional = Number(trade.sellAmount);
  const maxTrade = Number(policy.maxTradeNotionalUsd6);
  const nav = Number(vault.navUsd6);
  const exposureBps = nav > 0 ? Math.round((tradeNotional / nav) * 10000) : 10000;
  const slippageBps = 18; // simulated 0.18%

  if (!agent.active) reasons.push("AGENT_NOT_ACTIVE");
  if (Number(agent.staked) < Number(policy.agentStakeRequired))
    reasons.push("INSUFFICIENT_STAKE");
  if (tradeNotional > maxTrade)
    reasons.push(`MAX_TRADE_EXCEEDED: ${formatUsd6(trade.sellAmount)} > max ${formatUsd6(policy.maxTradeNotionalUsd6)}`);
  if (exposureBps > policy.maxPositionBps)
    reasons.push(`MAX_EXPOSURE_EXCEEDED: ${formatBps(exposureBps)} > max ${formatBps(policy.maxPositionBps)}`);
  if (slippageBps > policy.maxSlippageBps)
    reasons.push(`MAX_SLIPPAGE_EXCEEDED: ${formatBps(slippageBps)} > max ${formatBps(policy.maxSlippageBps)}`);

  const approved = reasons.length === 0;
  const reportId = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

  return {
    reportId,
    verdict: approved ? "APPROVE" : "REJECT",
    reason: approved ? "ALL_CHECKS_PASSED" : reasons.join("; "),
    txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
    details: {
      navUsd6: vault.navUsd6,
      postTradeExposureBps: exposureBps,
      expectedPriceUsd6: "3000000000",
      slippageBps,
      tradeNotionalUsd6: trade.sellAmount,
      agentStake: agent.staked,
    },
  };
}

export default function Dashboard() {
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [agentStake, setAgentStake] = useState(MOCK_AGENT.staked);

  const now = () => new Date().toLocaleTimeString("en-US", { hour12: false });

  const proposeTrade = async (trade: typeof GOOD_TRADE) => {
    setProcessing(true);
    setVerdict(null);

    // Simulate CRE processing delay
    await new Promise((r) => setTimeout(r, 1500));

    const agent = { ...MOCK_AGENT, staked: agentStake };
    const result = evaluateTrade(trade, MOCK_POLICY, MOCK_VAULT, agent);

    setVerdict(result);
    setActivity((prev) => [
      {
        time: now(),
        event: "TradeProposed",
        detail: `${trade.label} by agent`,
        type: "info",
      },
      {
        time: now(),
        event: result.verdict === "APPROVE" ? "CRE_APPROVED" : "CRE_REJECTED",
        detail: result.reason.substring(0, 60),
        type: result.verdict === "APPROVE" ? "approve" : "reject",
      },
      ...(result.verdict === "REJECT"
        ? [
            {
              time: now(),
              event: "StakeSlashed",
              detail: `${formatBps(MOCK_POLICY.slashBpsOnReject)} of stake slashed`,
              type: "slash" as const,
            },
          ]
        : []),
      ...prev,
    ]);

    // Simulate slash on reject
    if (result.verdict === "REJECT") {
      const slashAmount = Math.floor(
        (Number(agentStake) * MOCK_POLICY.slashBpsOnReject) / 10000
      );
      setAgentStake(String(Number(agentStake) - slashAmount));
    }

    setProcessing(false);
  };

  const executeTrade = async () => {
    if (!verdict || verdict.verdict !== "APPROVE") return;
    setExecuting(true);
    await new Promise((r) => setTimeout(r, 1000));

    setActivity((prev) => [
      {
        time: now(),
        event: "TradeExecuted",
        detail: `Report ${verdict.reportId.substring(0, 10)}… applied to vault`,
        type: "execute",
      },
      ...prev,
    ]);
    setExecuting(false);
  };

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-6 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Trade Evaluation Dashboard</h1>
        <p className="text-foreground/50">
          CRE-enforced policy constraints • AI proposes, CRE judges, vault executes
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard label="Vault NAV" value={formatUsd6(MOCK_VAULT.navUsd6)} />
        <StatCard label="WETH Exposure" value={formatBps(MOCK_VAULT.wethExposureBps)} />
        <StatCard label="Agent Stake" value={formatUsd6(agentStake)} />
        <StatCard
          label="Agent Status"
          value={MOCK_AGENT.active ? "Active ✓" : "Inactive"}
          highlight={MOCK_AGENT.active}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Policy + Trade Proposals */}
        <div className="lg:col-span-2 space-y-6">
          {/* Policy Card */}
          <div className="bg-card border border-card-border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Vault Policy Constraints</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <PolicyField label="Max Trade" value={formatUsd6(MOCK_POLICY.maxTradeNotionalUsd6)} />
              <PolicyField label="Max Slippage" value={formatBps(MOCK_POLICY.maxSlippageBps)} />
              <PolicyField label="Max Position" value={formatBps(MOCK_POLICY.maxPositionBps)} />
              <PolicyField label="Cooldown" value={`${MOCK_POLICY.cooldownSeconds}s`} />
              <PolicyField label="Allowed Assets" value={MOCK_POLICY.allowedAssets.join(", ")} />
              <PolicyField label="Slash on Reject" value={formatBps(MOCK_POLICY.slashBpsOnReject)} />
            </div>
          </div>

          {/* Propose Trade */}
          <div className="bg-card border border-card-border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Propose Trade</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <TradeButton
                trade={GOOD_TRADE}
                variant="good"
                onClick={() => proposeTrade(GOOD_TRADE)}
                disabled={processing}
              />
              <TradeButton
                trade={BAD_TRADE}
                variant="bad"
                onClick={() => proposeTrade(BAD_TRADE)}
                disabled={processing}
              />
            </div>
            {processing && (
              <div className="mt-4 flex items-center gap-3 text-sm text-foreground/60">
                <span className="w-4 h-4 border-2 border-chainlink border-t-transparent rounded-full animate-spin" />
                CRE DON evaluating trade proposal...
              </div>
            )}
          </div>

          {/* Verdict Display */}
          {verdict && (
            <div
              className={`border rounded-xl p-6 ${
                verdict.verdict === "APPROVE"
                  ? "bg-green-500/5 border-green-500/30"
                  : "bg-red-500/5 border-red-500/30"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">CRE Verdict</h2>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-bold ${
                    verdict.verdict === "APPROVE"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {verdict.verdict}
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-foreground/50">Reason:</span>{" "}
                  <span className="font-mono">{verdict.reason}</span>
                </div>
                <div>
                  <span className="text-foreground/50">Report ID:</span>{" "}
                  <span className="font-mono text-xs">{verdict.reportId}</span>
                </div>
                <div>
                  <span className="text-foreground/50">Tx Hash:</span>{" "}
                  <span className="font-mono text-xs">{verdict.txHash}</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-card-border/50">
                  <MiniStat
                    label="Post-trade Exposure"
                    value={formatBps(verdict.details.postTradeExposureBps)}
                    warn={verdict.details.postTradeExposureBps > MOCK_POLICY.maxPositionBps}
                  />
                  <MiniStat
                    label="Slippage"
                    value={formatBps(verdict.details.slippageBps)}
                    warn={verdict.details.slippageBps > MOCK_POLICY.maxSlippageBps}
                  />
                  <MiniStat
                    label="Trade Notional"
                    value={formatUsd6(verdict.details.tradeNotionalUsd6)}
                    warn={
                      Number(verdict.details.tradeNotionalUsd6) >
                      Number(MOCK_POLICY.maxTradeNotionalUsd6)
                    }
                  />
                  <MiniStat
                    label="ETH Price"
                    value={formatUsd6(verdict.details.expectedPriceUsd6)}
                  />
                </div>
              </div>

              {/* Execute Button */}
              <div className="mt-4">
                <button
                  onClick={executeTrade}
                  disabled={verdict.verdict !== "APPROVE" || executing}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    verdict.verdict === "APPROVE"
                      ? "bg-green-500 hover:bg-green-400 text-black cursor-pointer"
                      : "bg-foreground/10 text-foreground/30 cursor-not-allowed"
                  }`}
                >
                  {executing
                    ? "Executing..."
                    : verdict.verdict === "APPROVE"
                    ? "Execute Trade →"
                    : "Execution Blocked (REJECTED)"}
                </button>
                {verdict.verdict === "REJECT" && (
                  <p className="text-xs text-red-400/70 mt-2">
                    ⚠ Agent stake slashed: {formatBps(MOCK_POLICY.slashBpsOnReject)} penalty applied
                  </p>
                )}
              </div>
            </div>
          )}

          {/* On-chain Report */}
          {verdict && (
            <div className="bg-card border border-card-border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">On-chain Report</h2>
              <pre className="text-xs font-mono text-foreground/70 bg-background border border-card-border rounded-lg p-4 overflow-x-auto">
{`TradeReport {
  reportId:    ${verdict.reportId}
  vault:       0x...Vault
  agent:       ${MOCK_AGENT.address}
  verdict:     ${verdict.verdict} (${verdict.verdict === "APPROVE" ? "0" : "1"})
  intent: {
    sellToken:   USDC
    buyToken:    WETH
    sellAmount:  ${verdict.details.tradeNotionalUsd6}
    minBuyAmount: ...
    deadline:    ${Math.floor(Date.now() / 1000) + 300}
  }
  navUsd6:              ${verdict.details.navUsd6}
  postTradeExposureBps: ${verdict.details.postTradeExposureBps}
  expectedPriceUsd6:    ${verdict.details.expectedPriceUsd6}
  slippageBps:          ${verdict.details.slippageBps}
  reason:               "${verdict.reason}"
  exists:               true
}`}
              </pre>
            </div>
          )}
        </div>

        {/* Right: Activity Feed + CRE Status */}
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Activity Feed</h2>
            <div className="bg-card border border-card-border rounded-xl p-4 max-h-[500px] overflow-y-auto">
              {activity.length === 0 ? (
                <p className="text-sm text-foreground/30 text-center py-8">
                  Propose a trade to see activity
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
                            : "bg-foreground/30"
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-medium">{a.event}</div>
                        <div className="text-xs text-foreground/50 truncate">
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

          {/* CRE Workflow Status */}
          <div>
            <h2 className="text-lg font-semibold mb-4">CRE Workflow</h2>
            <div className="bg-card border border-card-border rounded-xl p-4 space-y-4">
              <StatusRow label="CRE Workflow" value="Active" active />
              <StatusRow label="DON Consensus" value="3/5 Nodes" active />
              <StatusRow
                label="Settlement"
                value="0x15fc…9f88"
                mono
              />
              <StatusRow label="Network" value="Base Sepolia" />
              <StatusRow label="Forwarder" value="0x15fc…9f88" mono />
            </div>
          </div>

          {/* Architecture */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Flow</h2>
            <div className="bg-card border border-card-border rounded-xl p-4 text-xs font-mono text-foreground/60 space-y-2">
              <div>1. Agent proposes trade</div>
              <div className="pl-2 text-chainlink">↓ HTTP trigger</div>
              <div>2. CRE reads policy from chain</div>
              <div className="pl-2 text-chainlink">↓ EVM read</div>
              <div>3. CRE fetches prices (2 sources)</div>
              <div className="pl-2 text-chainlink">↓ DON consensus</div>
              <div>4. Evaluate constraints</div>
              <div className="pl-2 text-chainlink">↓ verdict</div>
              <div>5. Write APPROVE/REJECT report</div>
              <div className="pl-2 text-chainlink">↓ Forwarder → Settlement</div>
              <div>6. Vault executes (only if APPROVE)</div>
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
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-6">
      <div className="text-foreground/50 text-sm mb-1">{label}</div>
      <div className={`text-2xl font-bold ${highlight ? "text-green-400" : ""}`}>
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
  trade,
  variant,
  onClick,
  disabled,
}: {
  trade: typeof GOOD_TRADE;
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
      <div className="font-semibold mb-1">{trade.label}</div>
      <div className="text-xs text-foreground/50">
        {trade.sellToken} → {trade.buyToken}
      </div>
      <div className="text-xs text-foreground/40 mt-1">{trade.description}</div>
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
