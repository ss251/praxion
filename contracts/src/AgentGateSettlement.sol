// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ReceiverTemplate} from "./interfaces/ReceiverTemplate.sol";

/// @title AgentGateSettlement
/// @notice On-chain settlement contract for the AgentGate × CRE verifiable agent commerce protocol.
/// @dev Receives DON-signed reports from CRE workflows that record AI agent service executions
///      with x402 payment verification. Extends ReceiverTemplate for Chainlink Forwarder security.
contract AgentGateSettlement is ReceiverTemplate {
    // ================================================================
    // │                          Errors                              │
    // ================================================================

    error InvalidReport();
    error DuplicateSettlement(bytes32 settlementId);

    // ================================================================
    // │                          Events                              │
    // ================================================================

    /// @notice Emitted when a service execution is settled on-chain
    event ServiceExecuted(
        bytes32 indexed settlementId,
        address indexed agent,
        bytes32 indexed serviceHash,
        uint256 paymentAmount,
        bytes32 resultHash,
        uint256 timestamp
    );

    /// @notice Emitted when a payment is confirmed settled
    event PaymentSettled(
        bytes32 indexed settlementId,
        address indexed agent,
        uint256 amount
    );

    // ================================================================
    // │                          Storage                             │
    // ================================================================

    struct Settlement {
        address agent;
        bytes32 serviceHash;
        uint256 paymentAmount;
        bytes32 resultHash;
        uint256 timestamp;
        bool exists;
    }

    /// @notice All settlements indexed by unique ID
    mapping(bytes32 settlementId => Settlement) public settlements;

    /// @notice Count of settlements per agent
    mapping(address agent => uint256 count) public agentSettlementCount;

    /// @notice Total number of settlements
    uint256 public totalSettlements;

    /// @notice Total payment volume settled
    uint256 public totalPaymentVolume;

    // ================================================================
    // │                        Constructor                           │
    // ================================================================

    /// @param _forwarderAddress Chainlink KeystoneForwarder address
    /// @dev Sepolia: 0x15fc6ae953e024d975e77382eeec56a9101f9f88
    constructor(address _forwarderAddress) ReceiverTemplate(_forwarderAddress) {}

    // ================================================================
    // │                    CRE Report Processing                     │
    // ================================================================

    /// @inheritdoc ReceiverTemplate
    /// @dev Decodes the DON-signed report and records the settlement.
    ///      Report format: abi.encode(address agent, bytes32 serviceHash, uint256 paymentAmount, bytes32 resultHash)
    function _processReport(bytes calldata report) internal override {
        if (report.length < 128) revert InvalidReport();

        (
            address agent,
            bytes32 serviceHash,
            uint256 paymentAmount,
            bytes32 resultHash
        ) = abi.decode(report, (address, bytes32, uint256, bytes32));

        // Generate unique settlement ID
        bytes32 settlementId = keccak256(
            abi.encodePacked(agent, serviceHash, paymentAmount, resultHash, block.timestamp)
        );

        if (settlements[settlementId].exists) revert DuplicateSettlement(settlementId);

        // Record settlement
        settlements[settlementId] = Settlement({
            agent: agent,
            serviceHash: serviceHash,
            paymentAmount: paymentAmount,
            resultHash: resultHash,
            timestamp: block.timestamp,
            exists: true
        });

        agentSettlementCount[agent]++;
        totalSettlements++;
        totalPaymentVolume += paymentAmount;

        emit ServiceExecuted(
            settlementId,
            agent,
            serviceHash,
            paymentAmount,
            resultHash,
            block.timestamp
        );

        emit PaymentSettled(settlementId, agent, paymentAmount);
    }

    // ================================================================
    // │                          Getters                             │
    // ================================================================

    /// @notice Get settlement details by ID
    function getSettlement(bytes32 settlementId) external view returns (Settlement memory) {
        return settlements[settlementId];
    }

    /// @notice Check if a settlement exists
    function settlementExists(bytes32 settlementId) external view returns (bool) {
        return settlements[settlementId].exists;
    }
}
