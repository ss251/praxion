# Praxion v2 — Full Security & Architecture Audit

**Date**: 2026-02-22  
**Auditor**: Automated (Claude)  
**Scope**: All contracts, CRE workflow, x402 server, frontend API routes, dashboard  
**Chain**: Base Sepolia (84532)  
**Chainlink ETH/USD Feed**: `0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1` (8 decimals)

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
**Impact**: `wethPriceUsd6 = 3000e6` is used for WETH deposit share calculation. Should match Chainlink price or use the router's price feed.  
**Mitigation**: Add a `setWethPrice()` function or read from Chainlink directly. Only affects `depositWETH()` — not used in the demo flow.

### MEDIUM-3: No deadline validation in Settlement.onReport
**File**: `contracts/src/PraxionSettlement.sol:44-75`  
**Impact**: Reports can be submitted with already-expired deadlines. The vault checks deadline on execution, so no actual exploit, but wasted gas.  
**Mitigation**: Add `require(intent.deadline > block.timestamp)` in `onReport`.

### MEDIUM-4: Chainlink price feed staleness not checked in MockRouter
**File**: `contracts/test/mocks/MockRouter.sol`  
**Impact**: The router reads `latestRoundData()` but doesn't check `updatedAt` for staleness. A stale price could lead to incorrect swap rates.  
**Mitigation**: Add `require(block.timestamp - updatedAt < MAX_STALENESS)` check. For testnet demo this is acceptable since Chainlink feeds on Base Sepolia update regularly.

### LOW-1: No event for MockRouter swaps
**File**: `contracts/test/mocks/MockRouter.sol`  
**Mitigation**: Add `event Swapped(...)` for observability.

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

## Chainlink Integration

### MockRouter reads real-time ETH/USD from Chainlink Data Feeds
- Feed address: `0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1` (ETH/USD, 8 decimals, Base Sepolia)
- Router constructor takes `_priceFeed` address (immutable)
- `swap()` calls `priceFeed.latestRoundData()` for real-time price at execution
- `price()` returns truncated integer price for convenience
- `priceRaw()` returns full precision answer + decimals + updatedAt

### CRE Evaluation uses 3 price sources
1. **Chainlink on-chain** (`MockRouter.priceRaw()` → `priceFeed.latestRoundData()`)
2. **CoinGecko HTTP** (`api.coingecko.com`)
3. **CoinPaprika HTTP** (`api.coinpaprika.com`)
- Consensus: **median** of 3 sources (robust against single source manipulation)
- Slippage metric: max price divergence across all 3 sources

---

## CRE Workflow (`workflow/tradeEvalCallback.ts`)

### INFO-1: Correct architecture
The CRE workflow correctly:
- Reads policy constraints from chain via EVMClient
- Fetches prices from 2 HTTP sources with consensus aggregation
- Evaluates all 7 constraint checks
- Encodes and submits report via DON's `writeReport`

### INFO-2: CRE vs API route slippage calculation differs
The CRE workflow calculates slippage as `(expectedBuyAmount - minBuyAmount) / expectedBuyAmount`, while the API route uses oracle price divergence across 3 sources (Chainlink + CoinGecko + CoinPaprika). The API route approach better reflects DON consensus behavior.

---

## x402 Server (`server/src/index.ts`)

### INFO-3: Functional but basic
The x402 payment server works correctly with proper error handling and $0.001 USDC payment per request.

---

## Frontend Dashboard

### INFO-4: No hardcoded mock data remaining
All prices come from Chainlink on-chain feed. Dashboard shows 3 price sources (Chainlink, CoinGecko, CoinPaprika) with consensus.

### INFO-5: Activity feed is client-side only
Activity items are stored in React state and lost on page refresh. For a demo this is fine.

### INFO-6: Router and StakeToken not shown in deployed contracts panel
Minor UI gap.

---

## Verified Demo Flow (2026-02-22)

1. `GET /api/state` → ✅ Returns real on-chain state, Chainlink price = $1950
2. `POST /api/evaluate` ($1,000 trade) → ✅ APPROVE, 3-source consensus (Chainlink $1950.89, CoinGecko $1949.51, CoinPaprika $1951.51)
3. `POST /api/execute` → ✅ Trade executed via router using Chainlink real-time price
4. `POST /api/evaluate` ($60,000 trade) → ✅ REJECT (MAX_TRADE + MAX_EXPOSURE), agent slashed 100 pxSTK (1000→900)
5. `GET /api/state` → ✅ Shows updated balances + reduced stake

All transactions verified on Base Sepolia blockscout.

---

## Deployed Contract Addresses (2026-02-22, v3 — Chainlink)

| Contract | Address |
|----------|---------|
| Chainlink ETH/USD Feed | `0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1` |
| USDC | `0x409b6284e73F79A29EA38F5eA33110099cd228e5` |
| WETH | `0x9557d1716B967C40d3f532B6d816D01b26914248` |
| pxSTK | `0x9A277205e2cE056e600fA1b9bf1C07D14b132DDe` |
| MockRouter | `0x418A72208906747D8076f8829b266afDc56724ba` |
| PraxionPolicy | `0xC994Ed6B8BC7FFA2EB5754909699166D72EAe032` |
| PraxionRegistry | `0x9eEbe4beaD2670b5aDC64Abb5C4D8E428A75060b` |
| PraxionSettlement | `0xB5E77252fCDe65f75cB2607a6D4A263A1B958AB4` |
| PraxionVault | `0x0d9D3926144d008f7c834B151d3828b4189d5FDd` |
