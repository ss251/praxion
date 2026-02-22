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
        router = new MockRouter(3000);

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

    // ═══════════════════════════════════════════════════════
    //  DEPOSIT TESTS
    // ═══════════════════════════════════════════════════════

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

    function test_DepositUSDC_Zero_Reverts() public {
        vm.prank(user);
        vm.expectRevert(bytes("ZERO"));
        vault.depositUSDC(0);
    }

    function test_DepositWETH_Zero_Reverts() public {
        vm.prank(user);
        vm.expectRevert(bytes("ZERO"));
        vault.depositWETH(0);
    }

    function test_DepositUSDC_TransfersTokens() public {
        uint256 amt = 5000e6;
        uint256 balBefore = usdc.balanceOf(user);
        vm.startPrank(user);
        usdc.approve(address(vault), amt);
        vault.depositUSDC(amt);
        vm.stopPrank();

        assertEq(usdc.balanceOf(user), balBefore - amt);
        assertEq(usdc.balanceOf(address(vault)), amt);
    }

    // ═══════════════════════════════════════════════════════
    //  WITHDRAWAL TESTS
    // ═══════════════════════════════════════════════════════

    function test_WithdrawUSDC_BurnsShares() public {
        uint256 amt = 5000e6;
        vm.startPrank(user);
        usdc.approve(address(vault), amt);
        vault.depositUSDC(amt);
        vault.withdrawUSDC(2000e6);
        vm.stopPrank();

        assertEq(vault.balanceOf(user), 3000e6);
        assertEq(vault.totalSupply(), 3000e6);
        assertEq(usdc.balanceOf(user), 100_000e6 - 3000e6);
    }

    function test_WithdrawUSDC_Zero_Reverts() public {
        vm.prank(user);
        vm.expectRevert(bytes("ZERO"));
        vault.withdrawUSDC(0);
    }

    function test_WithdrawUSDC_InsufficientShares_Reverts() public {
        vm.prank(user);
        vm.expectRevert(bytes("INSUFFICIENT_SHARES"));
        vault.withdrawUSDC(1e6);
    }

    // ═══════════════════════════════════════════════════════
    //  SETTLEMENT ACCESS CONTROL
    // ═══════════════════════════════════════════════════════

    function test_Settlement_OnlyForwarder() public {
        vm.expectRevert(PraxionSettlement.ONLY_FORWARDER.selector);
        settlement.onReport(bytes(""));
    }

    function test_Settlement_StoresReport() public {
        PraxionSettlement.TradeIntent memory intent = _defaultIntent();
        bytes32 rid = keccak256("test_store");
        _submitReport(rid, PraxionSettlement.Verdict.APPROVE, intent);

        PraxionSettlement.TradeReport memory r = settlement.getReport(rid);
        assertTrue(r.exists);
        assertEq(uint8(r.verdict), uint8(PraxionSettlement.Verdict.APPROVE));
        assertEq(r.vault, address(vault));
        assertEq(r.agent, agent);
        assertEq(r.intent.sellAmount, intent.sellAmount);
    }

    // ═══════════════════════════════════════════════════════
    //  AGENT REGISTRY TESTS
    // ═══════════════════════════════════════════════════════

    function test_Registry_IsActiveAgent() public view {
        assertTrue(registry.isActiveAgent(agent));
        assertFalse(registry.isActiveAgent(address(0xDEAD)));
    }

    function test_Registry_StakeAndUnstake() public {
        address agent2 = address(0xA2);
        registry.setAllowlisted(agent2, true);
        usdc.mint(agent2, 2000e6);

        vm.startPrank(agent2);
        usdc.approve(address(registry), 2000e6);
        registry.stake(2000e6);
        assertEq(registry.stakeOf(agent2), 2000e6);
        assertTrue(registry.isActiveAgent(agent2));

        registry.unstake(500e6);
        assertEq(registry.stakeOf(agent2), 1500e6);
        vm.stopPrank();
    }

    function test_Registry_Unstake_InsufficientStake_Reverts() public {
        vm.prank(agent);
        vm.expectRevert(bytes("INSUFFICIENT_STAKE"));
        registry.unstake(STAKE + 1);
    }

    function test_Registry_Slash_OnlySlasher() public {
        vm.prank(address(0xBEEF));
        vm.expectRevert(bytes("ONLY_SLASHER"));
        registry.slash(agent, 100e6, "test");
    }

    function test_Registry_SetMinStake() public {
        registry.setMinStake(500e6);
        assertEq(registry.minStake(), 500e6);
    }

    function test_Registry_SetMinStake_OnlyOwner() public {
        vm.prank(address(0xBEEF));
        vm.expectRevert(bytes("ONLY_OWNER"));
        registry.setMinStake(500e6);
    }

    // ═══════════════════════════════════════════════════════
    //  POLICY TESTS
    // ═══════════════════════════════════════════════════════

    function test_Policy_SetConstraints() public {
        PraxionPolicy.Constraints memory c = policy.constraints(address(vault));
        assertEq(c.maxTradeNotionalUsd6, 100_000e6);
        assertEq(c.maxSlippageBps, 100);
        assertEq(c.maxPositionBps, 5000);
        assertEq(c.cooldownSeconds, 60);
        assertEq(c.slashBpsOnReject, 1000);
    }

    function test_Policy_SetConstraints_OnlyOwner() public {
        vm.prank(address(0xBEEF));
        vm.expectRevert(bytes("ONLY_OWNER"));
        policy.setConstraints(address(vault), PraxionPolicy.Constraints({
            maxTradeNotionalUsd6: 1e6, maxSlippageBps: 50, maxPositionBps: 3000,
            cooldownSeconds: 30, onlyAllowedAssets: false, agentStakeRequired: 100e6,
            slashBpsOnReject: 500
        }));
    }

    function test_Policy_AllowedAsset() public {
        assertFalse(policy.isAllowedAsset(address(vault), address(weth)));
        policy.setAllowedAsset(address(vault), address(weth), true);
        assertTrue(policy.isAllowedAsset(address(vault), address(weth)));
        policy.setAllowedAsset(address(vault), address(weth), false);
        assertFalse(policy.isAllowedAsset(address(vault), address(weth)));
    }

    function test_Policy_BadSlippage_Reverts() public {
        vm.expectRevert(bytes("BAD_SLIPPAGE"));
        policy.setConstraints(address(vault), PraxionPolicy.Constraints({
            maxTradeNotionalUsd6: 1e6, maxSlippageBps: 10001, maxPositionBps: 3000,
            cooldownSeconds: 30, onlyAllowedAssets: false, agentStakeRequired: 100e6,
            slashBpsOnReject: 500
        }));
    }

    // ═══════════════════════════════════════════════════════
    //  TRADE EXECUTION TESTS
    // ═══════════════════════════════════════════════════════

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
            uint256(50_000e6),
            uint16(2500),
            uint256(3000e6),
            uint16(10),
            string("test")
        );
        vm.prank(forwarder);
        settlement.onReport(payload);
    }

    function _defaultIntent() internal view returns (PraxionSettlement.TradeIntent memory) {
        return PraxionSettlement.TradeIntent({
            sellToken:   address(usdc),
            buyToken:    address(weth),
            sellAmount:  3000e6,
            minBuyAmount: 9e17,
            deadline:    block.timestamp + 3600
        });
    }

    function test_ExecuteTrade_ApprovedReport_Succeeds_AndMarksUsed() public {
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

    function test_ExecuteTrade_UpdatesLastTradeTime() public {
        uint256 dep = 10_000e6;
        vm.startPrank(user);
        usdc.approve(address(vault), dep);
        vault.depositUSDC(dep);
        vm.stopPrank();

        PraxionSettlement.TradeIntent memory intent = _defaultIntent();
        bytes32 rid = keccak256("report_time");
        _submitReport(rid, PraxionSettlement.Verdict.APPROVE, intent);

        vault.executeTrade(intent, rid, agent);
        assertEq(vault.lastTradeTime(agent), block.timestamp);
    }

    function test_ExecuteTrade_RejectReport_Reverts_AndSlashes() public {
        PraxionSettlement.TradeIntent memory intent = _defaultIntent();
        bytes32 rid = keccak256("report_reject");

        uint256 stakeBefore = registry.stakeOf(agent);
        _submitReport(rid, PraxionSettlement.Verdict.REJECT, intent);

        uint256 stakeAfter = registry.stakeOf(agent);
        assertEq(stakeAfter, stakeBefore - (stakeBefore * 1000 / 10_000));

        vm.expectRevert(PraxionVault.AGENT_INACTIVE.selector);
        vault.executeTrade(intent, rid, agent);
    }

    function test_ExecuteTrade_MismatchedIntent_Reverts() public {
        PraxionSettlement.TradeIntent memory intent = _defaultIntent();
        bytes32 rid = keccak256("report_mm");
        _submitReport(rid, PraxionSettlement.Verdict.APPROVE, intent);

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

        vm.warp(block.timestamp + 61);
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

        vm.warp(block.timestamp + 10);
        bytes32 rid2 = keccak256("report_cd2");
        PraxionSettlement.TradeIntent memory intent2 = _defaultIntent();
        _submitReport(rid2, PraxionSettlement.Verdict.APPROVE, intent2);

        vm.expectRevert(PraxionVault.COOLDOWN.selector);
        vault.executeTrade(intent2, rid2, agent);
    }

    function test_ExecuteTrade_AfterCooldown_Succeeds() public {
        uint256 dep = 20_000e6;
        vm.startPrank(user);
        usdc.approve(address(vault), dep);
        vault.depositUSDC(dep);
        vm.stopPrank();

        PraxionSettlement.TradeIntent memory intent = _defaultIntent();
        bytes32 rid1 = keccak256("report_cd_ok1");
        _submitReport(rid1, PraxionSettlement.Verdict.APPROVE, intent);
        vault.executeTrade(intent, rid1, agent);

        vm.warp(block.timestamp + 61); // past cooldown
        bytes32 rid2 = keccak256("report_cd_ok2");
        PraxionSettlement.TradeIntent memory intent2 = _defaultIntent();
        _submitReport(rid2, PraxionSettlement.Verdict.APPROVE, intent2);

        vault.executeTrade(intent2, rid2, agent);
        assertTrue(vault.reportUsed(rid2));
    }

    function test_ExecuteTrade_AgentInactive_Reverts() public {
        PraxionSettlement.TradeIntent memory intent = _defaultIntent();
        bytes32 rid = keccak256("report_inactive");
        _submitReport(rid, PraxionSettlement.Verdict.APPROVE, intent);

        address fakeAgent = address(0xDEAD);
        vm.expectRevert(PraxionVault.AGENT_INACTIVE.selector);
        vault.executeTrade(intent, rid, fakeAgent);
    }

    function test_ExecuteTrade_ExpiredDeadline_Reverts() public {
        uint256 dep = 10_000e6;
        vm.startPrank(user);
        usdc.approve(address(vault), dep);
        vault.depositUSDC(dep);
        vm.stopPrank();

        PraxionSettlement.TradeIntent memory intent = PraxionSettlement.TradeIntent({
            sellToken:   address(usdc),
            buyToken:    address(weth),
            sellAmount:  3000e6,
            minBuyAmount: 9e17,
            deadline:    block.timestamp + 100
        });
        bytes32 rid = keccak256("report_expired");
        _submitReport(rid, PraxionSettlement.Verdict.APPROVE, intent);

        vm.warp(block.timestamp + 200); // past deadline
        vm.expectRevert(PraxionVault.REPORT_EXPIRED.selector);
        vault.executeTrade(intent, rid, agent);
    }

    // ═══════════════════════════════════════════════════════
    //  SLASHING FLOW (END-TO-END)
    // ═══════════════════════════════════════════════════════

    function test_Slashing_TransfersToOwner() public {
        uint256 ownerBalBefore = usdc.balanceOf(owner);
        PraxionSettlement.TradeIntent memory intent = _defaultIntent();
        bytes32 rid = keccak256("report_slash_treasury");
        _submitReport(rid, PraxionSettlement.Verdict.REJECT, intent);

        uint256 expectedSlash = STAKE * 1000 / 10_000; // 10%
        assertEq(usdc.balanceOf(owner), ownerBalBefore + expectedSlash);
    }

    function test_Slashing_ZeroSlashBps_NoSlash() public {
        // Set slash to 0
        policy.setConstraints(address(vault), PraxionPolicy.Constraints({
            maxTradeNotionalUsd6: 100_000e6,
            maxSlippageBps:       100,
            maxPositionBps:       5000,
            cooldownSeconds:      60,
            onlyAllowedAssets:    false,
            agentStakeRequired:   STAKE,
            slashBpsOnReject:     0
        }));

        uint256 stakeBefore = registry.stakeOf(agent);
        PraxionSettlement.TradeIntent memory intent = _defaultIntent();
        bytes32 rid = keccak256("report_noslash");
        _submitReport(rid, PraxionSettlement.Verdict.REJECT, intent);

        assertEq(registry.stakeOf(agent), stakeBefore);
    }

    // ═══════════════════════════════════════════════════════
    //  OWNERSHIP TESTS
    // ═══════════════════════════════════════════════════════

    function test_Ownership_TransferPolicy() public {
        address newOwner = address(0xABC1);
        policy.transferOwnership(newOwner);
        assertEq(policy.owner(), newOwner);
    }

    function test_Ownership_TransferRegistry() public {
        address newOwner = address(0xABC1);
        registry.transferOwnership(newOwner);
        assertEq(registry.owner(), newOwner);
    }
}
