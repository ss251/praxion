// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @dev Mock Chainlink AggregatorV3 for testing
contract MockPriceFeed {
    int256 public answer;
    uint8 public decimals;
    uint256 public updatedAt;

    constructor(int256 _answer, uint8 _decimals) {
        answer = _answer;
        decimals = _decimals;
        updatedAt = block.timestamp;
    }

    function setPrice(int256 _answer) external {
        answer = _answer;
        updatedAt = block.timestamp;
    }

    function latestRoundData() external view returns (
        uint80, int256, uint256, uint256, uint80
    ) {
        return (1, answer, updatedAt, updatedAt, 1);
    }
}
