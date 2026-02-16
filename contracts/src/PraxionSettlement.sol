// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {PraxionPolicy}        from "./PraxionPolicy.sol";
import {PraxionAgentRegistry}  from "./PraxionAgentRegistry.sol";

contract PraxionSettlement {
    // ── Types ──
    enum Verdict { APPROVE, REJECT }

    struct TradeIntent {
        address sellToken;
        address buyToken;
        uint256 sellAmount;
        uint256 minBuyAmount;
        uint256 deadline;
    }

    struct TradeReport {
        bytes32     reportId;
        address     vault;
        address     agent;
        Verdict     verdict;
        TradeIntent intent;
        uint256     navUsd6;
        uint16      postTradeExposureBps;
        uint256     expectedPriceUsd6;
        uint16      slippageBps;
        string      reason;
        bool        exists;
    }

    // ── State ──
    address public immutable forwarder;
    PraxionPolicy public immutable policy;
    PraxionAgentRegistry public immutable registry;

    mapping(bytes32 => TradeReport) internal _reports;

    event ReportStored(bytes32 indexed reportId, Verdict verdict, address indexed vault, address indexed agent);
    event AgentSlashed(bytes32 indexed reportId, address indexed agent, uint256 amount);

    error ONLY_FORWARDER();

    constructor(address _forwarder, address _policy, address _registry) {
        forwarder = _forwarder;
        policy    = PraxionPolicy(_policy);
        registry  = PraxionAgentRegistry(_registry);
    }

    function getReport(bytes32 reportId) external view returns (TradeReport memory) {
        return _reports[reportId];
    }

    function onReport(bytes calldata report) external {
        if (msg.sender != forwarder) revert ONLY_FORWARDER();

        (
            bytes32 reportId,
            address vault,
            address agent,
            uint8   verdictU8,
            TradeIntent memory intent,
            uint256 navUsd6,
            uint16  postTradeExposureBps,
            uint256 expectedPriceUsd6,
            uint16  slippageBps,
            string  memory reason
        ) = abi.decode(report, (bytes32, address, address, uint8, TradeIntent, uint256, uint16, uint256, uint16, string));

        Verdict verdict = Verdict(verdictU8);

        _reports[reportId] = TradeReport({
            reportId:              reportId,
            vault:                 vault,
            agent:                 agent,
            verdict:               verdict,
            intent:                intent,
            navUsd6:               navUsd6,
            postTradeExposureBps:  postTradeExposureBps,
            expectedPriceUsd6:     expectedPriceUsd6,
            slippageBps:           slippageBps,
            reason:                reason,
            exists:                true
        });

        emit ReportStored(reportId, verdict, vault, agent);

        if (verdict == Verdict.REJECT) {
            uint16 slashBps = policy.constraints(vault).slashBpsOnReject;
            if (slashBps > 0) {
                uint256 staked = registry.stakeOf(agent);
                uint256 slashAmt = (staked * slashBps) / 10_000;
                if (slashAmt > 0) {
                    registry.slash(agent, slashAmt, reason);
                    emit AgentSlashed(reportId, agent, slashAmt);
                }
            }
        }
    }
}
