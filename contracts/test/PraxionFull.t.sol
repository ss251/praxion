// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {MockERC20}             from "./mocks/MockERC20.sol";
import {MockRouter}            from "./mocks/MockRouter.sol";
import {PraxionPolicy}         from "../src/PraxionPolicy.sol";
import {PraxionAgentRegistry}  from "../src/PraxionAgentRegistry.sol";
import {PraxionSettlement}     from "../src/PraxionSettlement.sol";
import {PraxionVault}          from "../src/PraxionVault.sol";

contract PraxionFullTest is Test {
    MockERC20  usdc;
    MockERC20  weth;
    MockRouter router;

    PraxionPolicy        policy;
    PraxionAgentRegistry registry;
    PraxionSettlement    settlement;
    PraxionVault         vault;

    address owner    = address(this);
    address forwarder = address(0xF0);
    address agent    = address(0xA1);
    address user     = address(0xB1);

    uint256 constant STAKE = 1000e6;

    function setUp() public {
        usdc   = new MockERC20("USDC", "USDC", 6);
        weth   = new MockERC20("WETH", "WETH", 18);
        router = new MockRouter();

        policy   = new PraxionPolicy();
        registry = new PraxionAgentRegistry(address(usdc), STAKE);
        settlement = new PraxionSettlement(forwarder, address(policy), address(registry));

        vault = new PraxionVault(
            address(usdc),
            address(weth),
            address(policy),
            address(settlement),
            address(registry),
            address(router)
        );

        // Configure policy for the vault
        policy.setConstraints(address(vault), PraxionPolicy.Constraints({
            maxTradeNotionalUsd6: 100_000e6,
            maxSlippageBps:       100,
            maxPositionBps:       5000,
            cooldownSeconds:      60,
            onlyAllowedAssets:    false,
            agentStakeRequired:   STAKE,
            slashBpsOnReject:     1000 // 10%
        }));

        // Setup agent: allowlist, stake
        registry.setAllowlisted(agent, true);
        registry.setSlasher(address(settlement), true);
        usdc.mint(agent, STAKE);
        vm.prank(agent);
        usdc.approve(address(registry), STAKE);
        vm.prank(agent);
        registry.stake(STAKE);

        // Fund user
        usdc.mint(user, 100_000e6);
        weth.mint(user, 10e18);

        // Start at a reasonable timestamp
        vm.warp(10_000);
    }

    // ── Deposit tests ──

    function test_DepositUSDC_MintsShares() public {
        uint256 amt = 5000e6;
        vm.startPrank(user);
        usdc.approve(address(vault), amt);
        vault.depositUSDC(amt);
        vm.stopPrank();

        assertEq(vault.balanceOf(user), amt);
        assertEq(vault.totalSupply(), amt);
    }

    function test_DepositWETH_MintsShares_UsesPrice() public {
        uint256 amt = 1e18; // 1 WETH
        vm.startPrank(user);
        weth.approve(address(vault), amt);
        vault.depositWETH(amt);
        vm.stopPrank();

        // 1 WETH * 3000e6 / 1e18 = 3000e6 shares
        assertEq(vault.balanceOf(user), 3000e6);
    }

    // ── Settlement access control ──

    function test_Settlement_OnlyForwarder() public {
        vm.expectRevert(PraxionSettlement.ONLY_FORWARDER.selector);
        settlement.onReport(bytes(""));
    }

    // ── Helper to submit a report ──

    function _submitReport(
        bytes32 reportId,
        PraxionSettlement.Verdict verdict,
        PraxionSettlement.TradeIntent memory intent
    ) internal {
        bytes memory payload = abi.encode(
            reportId,
            address(vault),
            agent,
            uint8(verdict),
            intent,
            uint256(50_000e6),  // navUsd6
            uint16(2500),       // postTradeExposureBps
            uint256(3000e6),    // expectedPriceUsd6
            uint16(10),         // slippageBps
            string("test")      // reason
        );
        vm.prank(forwarder);
        settlement.onReport(payload);
    }

    function _defaultIntent() internal view returns (PraxionSettlement.TradeIntent memory) {
        return PraxionSettlement.TradeIntent({
            sellToken:   address(usdc),
            buyToken:    address(weth),
            sellAmount:  3000e6,
            minBuyAmount: 9e17, // 0.9 WETH
            deadline:    block.timestamp + 3600
        });
    }

    // ── Execute trade tests ──

    function test_ExecuteTrade_ApprovedReport_Succeeds_AndMarksUsed() public {
        // Deposit USDC into vault first
        uint256 dep = 10_000e6;
        vm.startPrank(user);
        usdc.approve(address(vault), dep);
        vault.depositUSDC(dep);
        vm.stopPrank();

        PraxionSettlement.TradeIntent memory intent = _defaultIntent();
        bytes32 rid = keccak256("report1");

        _submitReport(rid, PraxionSettlement.Verdict.APPROVE, intent);

        vault.executeTrade(intent, rid, agent);

        assertTrue(vault.reportUsed(rid));
    }

    function test_ExecuteTrade_RejectReport_Reverts_AndSlashes() public {
        PraxionSettlement.TradeIntent memory intent = _defaultIntent();
        bytes32 rid = keccak256("report_reject");

        uint256 stakeBefore = registry.stakeOf(agent);
        _submitReport(rid, PraxionSettlement.Verdict.REJECT, intent);

        // Agent should have been slashed 10%
        uint256 stakeAfter = registry.stakeOf(agent);
        assertEq(stakeAfter, stakeBefore - (stakeBefore * 1000 / 10_000));

        // Agent got slashed below minStake, so AGENT_INACTIVE fires first
        vm.expectRevert(PraxionVault.AGENT_INACTIVE.selector);
        vault.executeTrade(intent, rid, agent);
    }

    function test_ExecuteTrade_MismatchedIntent_Reverts() public {
        PraxionSettlement.TradeIntent memory intent = _defaultIntent();
        bytes32 rid = keccak256("report_mm");
        _submitReport(rid, PraxionSettlement.Verdict.APPROVE, intent);

        // Modify intent
        PraxionSettlement.TradeIntent memory badIntent = intent;
        badIntent.sellAmount = 999e6;

        vm.expectRevert(PraxionVault.REPORT_MISMATCH.selector);
        vault.executeTrade(badIntent, rid, agent);
    }

    function test_ExecuteTrade_Replay_Reverts() public {
        uint256 dep = 10_000e6;
        vm.startPrank(user);
        usdc.approve(address(vault), dep);
        vault.depositUSDC(dep);
        vm.stopPrank();

        PraxionSettlement.TradeIntent memory intent = _defaultIntent();
        bytes32 rid = keccak256("report_replay");
        _submitReport(rid, PraxionSettlement.Verdict.APPROVE, intent);

        vault.executeTrade(intent, rid, agent);

        vm.warp(block.timestamp + 61); // past cooldown
        vm.expectRevert(PraxionVault.REPORT_REUSED.selector);
        vault.executeTrade(intent, rid, agent);
    }

    function test_ExecuteTrade_Cooldown_Reverts() public {
        uint256 dep = 20_000e6;
        vm.startPrank(user);
        usdc.approve(address(vault), dep);
        vault.depositUSDC(dep);
        vm.stopPrank();

        PraxionSettlement.TradeIntent memory intent = _defaultIntent();
        bytes32 rid1 = keccak256("report_cd1");
        _submitReport(rid1, PraxionSettlement.Verdict.APPROVE, intent);
        vault.executeTrade(intent, rid1, agent);

        // Second trade immediately (no warp) should hit cooldown
        vm.warp(block.timestamp + 10); // still within 60s cooldown
        bytes32 rid2 = keccak256("report_cd2");
        PraxionSettlement.TradeIntent memory intent2 = _defaultIntent();
        _submitReport(rid2, PraxionSettlement.Verdict.APPROVE, intent2);

        vm.expectRevert(PraxionVault.COOLDOWN.selector);
        vault.executeTrade(intent2, rid2, agent);
    }

    function test_ExecuteTrade_AgentInactive_Reverts() public {
        PraxionSettlement.TradeIntent memory intent = _defaultIntent();
        bytes32 rid = keccak256("report_inactive");
        _submitReport(rid, PraxionSettlement.Verdict.APPROVE, intent);

        address fakeAgent = address(0xDEAD);
        // The report was submitted with `agent`, calling with fakeAgent should fail at isActiveAgent
        vm.expectRevert(PraxionVault.AGENT_INACTIVE.selector);
        vault.executeTrade(intent, rid, fakeAgent);
    }
}
