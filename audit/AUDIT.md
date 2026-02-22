# Praxion v2 — Full Security & Architecture Audit

**Date**: 2026-02-22  
**Auditor**: Automated (Claude)  
**Scope**: All contracts, CRE workflow, x402 server, frontend API routes, dashboard  
**Chain**: Base Sepolia (84532)

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 2 |
| Medium | 4 |
| Low | 5 |
| Informational | 6 |

Overall: The system is well-architected for a hackathon demo. No critical vulnerabilities. High-severity items are acceptable for testnet but must be addressed before mainnet.

---

## Contracts

### HIGH-1: MockERC20.mint() is unrestricted
**File**: `contracts/test/mocks/MockERC20.sol`  
**Impact**: Anyone can mint unlimited tokens (USDC, WETH, pxSTK).  
**Mitigation**: Acceptable for testnet. For mainnet, use real tokens or add `onlyOwner` to `mint()`.

### HIGH-2: Settlement forwarder is a single EOA
**File**: `contracts/src/PraxionSettlement.sol:68`  
**Impact**: The `forwarder` (deployer EOA) can submit arbitrary reports including fraudulent APPROVEs. In production, this should be the DON's forwarder contract.  
**Mitigation**: Acceptable for demo — the API route simulates the CRE DON. For mainnet, set `forwarder` to the CRE forwarder contract address.

### MEDIUM-1: No reentrancy guard on executeTrade
**File**: `contracts/src/PraxionVault.sol:86-121`  
**Impact**: The `router.call()` on line 114 makes an external call that could re-enter. However, the `reportUsed[reportId] = true` on line 108 prevents replay, and MockRouter doesn't have callbacks, so risk is theoretical.  
**Mitigation**: Add `ReentrancyGuard` or checks-effects-interactions pattern for mainnet.

### MEDIUM-2: PraxionVault.wethPriceUsd6 is hardcoded and not updateable
**File**: `contracts/src/PraxionVault.sol:30`  
**Impact**: `wethPriceUsd6 = 3000e6` is used for WETH deposit share calculation. Should match router price or use an oracle.  
**Mitigation**: Add a `setWethPrice()` function or integrate a Chainlink price feed. Only affects `depositWETH()` — not used in the demo flow.

### MEDIUM-3: No deadline validation in Settlement.onReport
**File**: `contracts/src/PraxionSettlement.sol:44-75`  
**Impact**: Reports can be submitted with already-expired deadlines. The vault checks deadline on execution, so no actual exploit, but wasted gas.  
**Mitigation**: Add `require(intent.deadline > block.timestamp)` in `onReport`.

### MEDIUM-4: Slash-before-check in REJECT flow
**File**: `contracts/src/PraxionSettlement.sol:65-74`  
**Impact**: When a REJECT report is submitted, the agent is slashed immediately in `onReport`. If the same agent has pending APPROVE reports, those could fail if the slash brings stake below minimum. This is actually correct behavior (rejected agents shouldn't have pending approves), but worth noting.  
**Mitigation**: None needed — this is by design.

### LOW-1: No event for MockRouter price changes
**File**: `contracts/test/mocks/MockRouter.sol`  
**Mitigation**: Add `event PriceSet(uint256 newPrice)` for observability.

### LOW-2: Integer truncation in exposure calculation
**File**: `frontend/app/api/evaluate/route.ts:109`  
**Impact**: `postTradeExposureBps` uses integer division which truncates. For small trades relative to NAV, this could round to 0.  
**Mitigation**: Acceptable precision for the use case.

### LOW-3: Cooldown uses `Date.now()` vs `block.timestamp`
**File**: `frontend/app/api/evaluate/route.ts:79-82`  
**Impact**: The evaluate route uses JavaScript `Date.now()` to check cooldown against on-chain `lastTradeTime` (which uses `block.timestamp`). Clock skew between JS and L2 block time could cause false passes/fails.  
**Mitigation**: Could read the latest block timestamp instead. Minor issue for demo.

### LOW-4: No input validation on evaluate route
**File**: `frontend/app/api/evaluate/route.ts:27-34`  
**Impact**: `sellAmount`, `minBuyAmount`, `deadline` are taken as strings and converted to BigInt. Invalid inputs will throw unhandled errors.  
**Mitigation**: Add validation: check non-empty, numeric, positive values.

### LOW-5: No input validation on execute route
**File**: `frontend/app/api/execute/route.ts:10`  
**Impact**: `reportId` is not validated as bytes32 format before chain call.  
**Mitigation**: Add hex format validation.

---

## CRE Workflow (`workflow/tradeEvalCallback.ts`)

### INFO-1: Correct architecture
The CRE workflow correctly:
- Reads policy constraints from chain via EVMClient
- Fetches prices from 2 sources with consensus aggregation
- Evaluates all 7 constraint checks
- Encodes and submits report via DON's `writeReport`
- Handles slippage as (expectedBuyAmount - minBuyAmount) / expectedBuyAmount

### INFO-2: CRE vs API route slippage calculation differs
The CRE workflow calculates slippage as `(expectedBuyAmount - minBuyAmount) / expectedBuyAmount`, while the API route uses oracle price divergence. Both are valid approaches:
- CRE: measures the agent's tolerance (how much slippage they're willing to accept)
- API: measures market uncertainty (how much price sources disagree)

The API route approach is arguably better for a "DON consensus simulation" since it reflects what multiple oracle nodes would observe.

---

## x402 Server (`server/src/index.ts`)

### INFO-3: Functional but basic
The x402 payment server works correctly:
- Health endpoint is free
- Price and analysis endpoints require x402 payment ($0.001 USDC)
- Uses CoinGecko as data source
- Proper error handling

### LOW: PAYEE_ADDRESS is hardcoded fallback
If `PAYEE_ADDRESS` env var isn't set, defaults to a specific address. Should require it.

---

## Frontend Dashboard

### INFO-4: No hardcoded mock data remaining
After fixes, the dashboard:
- Reads router price from chain for minBuyAmount calculation
- Uses router price for WETH valuation (not hardcoded $3000)
- All state comes from `/api/state` which reads real chain data
- Both APPROVE and REJECT flows work end-to-end

### INFO-5: Activity feed is client-side only
Activity items are stored in React state and lost on page refresh. For a demo this is fine.

### INFO-6: Router and StakeToken not shown in deployed contracts panel
The "Deployed Contracts" section in the sidebar doesn't list MockRouter or pxSTK. Minor UI gap.

---

## Verified Demo Flow (2026-02-22)

1. `GET /api/state` → ✅ Returns real on-chain state, router price = $1960
2. `POST /api/evaluate` ($1,000 trade) → ✅ APPROVE, report written on-chain
3. `POST /api/execute` → ✅ Trade executed, USDC -$1000, WETH +0.5102
4. `POST /api/evaluate` ($60,000 trade) → ✅ REJECT (MAX_TRADE + MAX_EXPOSURE), agent slashed 100 pxSTK
5. `GET /api/state` → ✅ Shows updated balances + reduced stake (1000 → 900 pxSTK)

All transactions verified on Base Sepolia blockscout.

---

## Deployed Contract Addresses (2026-02-22)

| Contract | Address |
|----------|---------|
| USDC | `0x241B2a5991Ee51c18DF255cE010B7ECc52B2AE1d` |
| WETH | `0x71f58e4922B08322D8537B66E4310dE2C016F0b0` |
| pxSTK | `0x27AD216073378B2505Af70F01952BDA0Cc1bB202` |
| MockRouter | `0x89192bb10471a818036DA196e57912991D5a8bDe` |
| PraxionPolicy | `0xd2c81Bb6c6A348715fadA9Af7189191b2ec07c18` |
| PraxionRegistry | `0xdF3625C6D98081dcEc92003Fb40c5d131eebDc1F` |
| PraxionSettlement | `0x9B8264A9dEB218FCee6829825534E9F744f25F56` |
| PraxionVault | `0x2D23c43301934F0d9AC6553A3E0A82096E40Cf6e` |
