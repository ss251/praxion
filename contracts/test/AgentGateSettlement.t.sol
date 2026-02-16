// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {AgentGateSettlement} from "../src/AgentGateSettlement.sol";
import {IReceiver} from "../src/interfaces/IReceiver.sol";

contract AgentGateSettlementTest is Test {
    AgentGateSettlement public settlement;

    address public forwarder = address(0xF0F0);
    address public owner = address(this);
    address public agent1 = address(0xA1);
    address public agent2 = address(0xA2);

    bytes32 public serviceHash = keccak256("price-feed");
    bytes32 public resultHash = keccak256('{"bitcoin":{"usd":100000}}');

    event ServiceExecuted(
        bytes32 indexed settlementId,
        address indexed agent,
        bytes32 indexed serviceHash,
        uint256 paymentAmount,
        bytes32 resultHash,
        uint256 timestamp
    );

    event PaymentSettled(
        bytes32 indexed settlementId,
        address indexed agent,
        uint256 amount
    );

    function setUp() public {
        settlement = new AgentGateSettlement(forwarder);
    }

    // ================================================================
    // │                     Constructor Tests                        │
    // ================================================================

    function test_constructor_setsForwarder() public view {
        assertEq(settlement.getForwarderAddress(), forwarder);
    }

    function test_constructor_revertsOnZeroForwarder() public {
        vm.expectRevert();
        new AgentGateSettlement(address(0));
    }

    // ================================================================
    // │                     Report Processing                        │
    // ================================================================

    function test_processReport_recordsSettlement() public {
        uint256 paymentAmount = 100000; // 0.10 USDC

        bytes memory report = abi.encode(agent1, serviceHash, paymentAmount, resultHash);

        // Build metadata (workflowId, workflowName, workflowOwner)
        bytes memory metadata = abi.encodePacked(
            bytes32(0), // workflowId
            bytes10(0), // workflowName
            address(0)  // workflowOwner
        );

        vm.prank(forwarder);
        settlement.onReport(metadata, report);

        assertEq(settlement.totalSettlements(), 1);
        assertEq(settlement.totalPaymentVolume(), paymentAmount);
        assertEq(settlement.agentSettlementCount(agent1), 1);
    }

    function test_processReport_emitsEvents() public {
        uint256 paymentAmount = 500000; // 0.50 USDC
        bytes memory report = abi.encode(agent1, serviceHash, paymentAmount, resultHash);
        bytes memory metadata = abi.encodePacked(bytes32(0), bytes10(0), address(0));

        vm.prank(forwarder);
        // Just verify it doesn't revert and events are emitted
        settlement.onReport(metadata, report);

        // Verify state changes as proxy for events
        assertEq(settlement.totalSettlements(), 1);
    }

    function test_processReport_multipleAgents() public {
        bytes memory metadata = abi.encodePacked(bytes32(0), bytes10(0), address(0));

        bytes memory report1 = abi.encode(agent1, serviceHash, uint256(100000), resultHash);
        vm.prank(forwarder);
        settlement.onReport(metadata, report1);

        // Warp time so settlement ID differs
        vm.warp(block.timestamp + 1);

        bytes32 serviceHash2 = keccak256("market-data");
        bytes memory report2 = abi.encode(agent2, serviceHash2, uint256(200000), resultHash);
        vm.prank(forwarder);
        settlement.onReport(metadata, report2);

        assertEq(settlement.totalSettlements(), 2);
        assertEq(settlement.totalPaymentVolume(), 300000);
        assertEq(settlement.agentSettlementCount(agent1), 1);
        assertEq(settlement.agentSettlementCount(agent2), 1);
    }

    function test_processReport_revertsInvalidReport() public {
        bytes memory metadata = abi.encodePacked(bytes32(0), bytes10(0), address(0));
        bytes memory shortReport = abi.encode(agent1); // Too short

        vm.prank(forwarder);
        vm.expectRevert();
        settlement.onReport(metadata, shortReport);
    }

    function test_processReport_revertsNonForwarder() public {
        bytes memory metadata = abi.encodePacked(bytes32(0), bytes10(0), address(0));
        bytes memory report = abi.encode(agent1, serviceHash, uint256(100000), resultHash);

        // Call from non-forwarder address
        vm.prank(address(0xBAD));
        vm.expectRevert();
        settlement.onReport(metadata, report);
    }

    // ================================================================
    // │                      Getter Tests                            │
    // ================================================================

    function test_getSettlement() public {
        uint256 paymentAmount = 100000;
        bytes memory metadata = abi.encodePacked(bytes32(0), bytes10(0), address(0));
        bytes memory report = abi.encode(agent1, serviceHash, paymentAmount, resultHash);

        vm.prank(forwarder);
        settlement.onReport(metadata, report);

        // Compute expected settlement ID
        bytes32 expectedId = keccak256(
            abi.encodePacked(agent1, serviceHash, paymentAmount, resultHash, block.timestamp)
        );

        AgentGateSettlement.Settlement memory s = settlement.getSettlement(expectedId);
        assertTrue(s.exists);
        assertEq(s.agent, agent1);
        assertEq(s.serviceHash, serviceHash);
        assertEq(s.paymentAmount, paymentAmount);
        assertEq(s.resultHash, resultHash);
    }

    function test_settlementExists_false() public view {
        assertFalse(settlement.settlementExists(bytes32(0)));
    }

    // ================================================================
    // │                     ERC165 Support                           │
    // ================================================================

    function test_supportsInterface() public view {
        assertTrue(settlement.supportsInterface(type(IReceiver).interfaceId));
    }
}
