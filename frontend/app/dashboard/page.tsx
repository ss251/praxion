const mockSettlements = [
  {
    id: "0x3f2a8b1c…d4e9",
    agent: "0xA1b2…C3d4",
    service: "price-feed",
    amount: "0.10 USDC",
    result: "BTC: $104,230",
    timestamp: "2 min ago",
    status: "confirmed",
  },
  {
    id: "0x8b1c3f2a…9d4e",
    agent: "0xE5f6…G7h8",
    service: "market-data",
    amount: "0.25 USDC",
    result: "ETH market cap: $420B",
    timestamp: "5 min ago",
    status: "confirmed",
  },
  {
    id: "0x9d4e8b1c…3f2a",
    agent: "0xI9j0…K1l2",
    service: "price-feed",
    amount: "0.10 USDC",
    result: "LINK: $18.42",
    timestamp: "12 min ago",
    status: "confirmed",
  },
  {
    id: "0xd4e93f2a…8b1c",
    agent: "0xA1b2…C3d4",
    service: "custom",
    amount: "0.50 USDC",
    result: "Weather: 72°F, Clear",
    timestamp: "18 min ago",
    status: "confirmed",
  },
  {
    id: "0x1c3f2a8b…d4e9",
    agent: "0xM3n4…O5p6",
    service: "price-feed",
    amount: "0.10 USDC",
    result: "SOL: $178.50",
    timestamp: "24 min ago",
    status: "confirmed",
  },
];

const activityFeed = [
  { time: "14:32:01", event: "ServiceExecuted", detail: "price-feed by 0xA1b2…C3d4" },
  { time: "14:32:01", event: "PaymentSettled", detail: "0.10 USDC → 0xA1b2…C3d4" },
  { time: "14:27:45", event: "ServiceExecuted", detail: "market-data by 0xE5f6…G7h8" },
  { time: "14:27:45", event: "PaymentSettled", detail: "0.25 USDC → 0xE5f6…G7h8" },
  { time: "14:20:12", event: "ServiceExecuted", detail: "price-feed by 0xI9j0…K1l2" },
  { time: "14:14:33", event: "ServiceExecuted", detail: "custom by 0xA1b2…C3d4" },
  { time: "14:08:19", event: "PaymentSettled", detail: "0.10 USDC → 0xM3n4…O5p6" },
];

const stats = [
  { label: "Total Settlements", value: "1,247" },
  { label: "Payment Volume", value: "312.50 USDC" },
  { label: "Active Agents", value: "38" },
  { label: "Avg Response", value: "2.4s" },
];

export default function Dashboard() {
  return (
    <div className="min-h-screen max-w-7xl mx-auto px-6 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-foreground/50">
          Real-time settlements and agent activity on Sepolia testnet
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-card border border-card-border rounded-xl p-6"
          >
            <div className="text-foreground/50 text-sm mb-1">{s.label}</div>
            <div className="text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Settlements */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Recent Settlements</h2>
          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-card-border text-foreground/50">
                    <th className="text-left p-4 font-medium">Settlement ID</th>
                    <th className="text-left p-4 font-medium">Agent</th>
                    <th className="text-left p-4 font-medium">Service</th>
                    <th className="text-left p-4 font-medium">Amount</th>
                    <th className="text-left p-4 font-medium">Result</th>
                    <th className="text-left p-4 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {mockSettlements.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-card-border/50 hover:bg-card-border/20 transition-colors"
                    >
                      <td className="p-4 font-mono text-xs text-chainlink">
                        {s.id}
                      </td>
                      <td className="p-4 font-mono text-xs">{s.agent}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-chainlink/10 text-chainlink rounded text-xs">
                          {s.service}
                        </span>
                      </td>
                      <td className="p-4">{s.amount}</td>
                      <td className="p-4 text-foreground/60">{s.result}</td>
                      <td className="p-4 text-foreground/40">{s.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Agent Activity</h2>
          <div className="bg-card border border-card-border rounded-xl p-4 space-y-3">
            {activityFeed.map((a, i) => (
              <div
                key={i}
                className="flex items-start gap-3 pb-3 border-b border-card-border/50 last:border-0 last:pb-0"
              >
                <div
                  className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    a.event === "ServiceExecuted"
                      ? "bg-chainlink"
                      : "bg-green-500"
                  }`}
                />
                <div className="min-w-0">
                  <div className="text-xs font-medium">
                    {a.event}
                  </div>
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

          {/* Workflow Status */}
          <h2 className="text-xl font-semibold mb-4 mt-8">Workflow Status</h2>
          <div className="bg-card border border-card-border rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">CRE Workflow</span>
              <span className="flex items-center gap-2 text-xs text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Active
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">DON Consensus</span>
              <span className="flex items-center gap-2 text-xs text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                3/5 Nodes
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Settlement Contract</span>
              <span className="text-xs text-foreground/50 font-mono">
                0x15fc…9f88
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Network</span>
              <span className="text-xs text-foreground/50">Sepolia</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
