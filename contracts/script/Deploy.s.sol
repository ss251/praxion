// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {MockERC20}             from "../test/mocks/MockERC20.sol";
import {MockRouter}            from "../test/mocks/MockRouter.sol";
import {PraxionPolicy}         from "../src/PraxionPolicy.sol";
import {PraxionAgentRegistry}  from "../src/PraxionAgentRegistry.sol";
import {PraxionSettlement}     from "../src/PraxionSettlement.sol";
import {PraxionVault}          from "../src/PraxionVault.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("AGENT_PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // 1. Mock tokens
        MockERC20 usdc  = new MockERC20("USD Coin",        "USDC",  6);
        MockERC20 weth  = new MockERC20("Wrapped Ether",   "WETH", 18);
        MockERC20 stake = new MockERC20("Praxion Stake",   "pxSTK", 18);

        // 2. Mock router with realistic ETH price
        MockRouter router = new MockRouter(1960);

        // 3. Policy
        PraxionPolicy policy = new PraxionPolicy();

        // 4. Agent Registry (min stake = 100 pxSTK)
        PraxionAgentRegistry registry = new PraxionAgentRegistry(
            address(stake),
            100e18
        );

        // 5. Settlement (forwarder = deployer for now, policy, registry)
        PraxionSettlement settlement = new PraxionSettlement(
            deployer,
            address(policy),
            address(registry)
        );

        // 6. Vault
        PraxionVault vault = new PraxionVault(
            address(usdc),
            address(weth),
            address(policy),
            address(settlement),
            address(registry),
            address(router)
        );

        // ── Configure ──

        // Set constraints for the vault
        policy.setConstraints(address(vault), PraxionPolicy.Constraints({
            maxTradeNotionalUsd6: 50_000e6,   // $50K max per trade
            maxSlippageBps:       500,          // 5% max slippage
            maxPositionBps:       3000,         // 30% max position
            cooldownSeconds:      60,           // 1 min cooldown
            onlyAllowedAssets:    true,
            agentStakeRequired:   100e18,       // 100 pxSTK
            slashBpsOnReject:     1000          // 10% slash on reject
        }));

        // Allow USDC and WETH as tradeable assets
        policy.setAllowedAsset(address(vault), address(usdc), true);
        policy.setAllowedAsset(address(vault), address(weth), true);

        // Allowlist the agent wallet
        registry.setAllowlisted(deployer, true);

        // Grant Settlement slasher role
        registry.setSlasher(address(settlement), true);

        // Mint tokens for demo
        usdc.mint(deployer,  1_000_000e6);   // 1M USDC
        weth.mint(deployer,  100e18);         // 100 WETH
        stake.mint(deployer, 10_000e18);      // 10K pxSTK

        // Mint liquidity to router for swaps
        weth.mint(address(router), 1000e18);
        usdc.mint(address(router), 3_000_000e6);

        // Stake agent
        stake.approve(address(registry), 1000e18);
        registry.stake(1000e18);

        // Deposit USDC into vault
        usdc.approve(address(vault), 100_000e6);
        vault.depositUSDC(100_000e6);

        vm.stopBroadcast();

        // Log addresses
        console.log("=== PRAXION DEPLOYMENT ===");
        console.log("Deployer:          ", deployer);
        console.log("USDC:              ", address(usdc));
        console.log("WETH:              ", address(weth));
        console.log("StakeToken (pxSTK):", address(stake));
        console.log("MockRouter:        ", address(router));
        console.log("PraxionPolicy:     ", address(policy));
        console.log("PraxionRegistry:   ", address(registry));
        console.log("PraxionSettlement: ", address(settlement));
        console.log("PraxionVault:      ", address(vault));
        console.log("=========================");
    }
}
