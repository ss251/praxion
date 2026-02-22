// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {MockERC20} from "./MockERC20.sol";

interface AggregatorV3Interface {
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
    function decimals() external view returns (uint8);
}

/// @dev Mock DEX router: swaps at real-time Chainlink ETH/USD price
contract MockRouter {
    AggregatorV3Interface public immutable priceFeed;

    constructor(address _priceFeed) {
        priceFeed = AggregatorV3Interface(_priceFeed);
    }

    /// @notice Returns the current ETH/USD price (no decimals, e.g. 1948)
    function price() external view returns (uint256) {
        (, int256 answer,,,) = priceFeed.latestRoundData();
        require(answer > 0, "INVALID_PRICE");
        uint8 dec = priceFeed.decimals();
        return uint256(answer) / (10 ** dec);
    }

    /// @notice Returns the raw Chainlink price with full precision (8 decimals)
    function priceRaw() external view returns (int256 answer, uint8 feedDecimals, uint256 updatedAt) {
        (, answer,, updatedAt,) = priceFeed.latestRoundData();
        feedDecimals = priceFeed.decimals();
    }

    function swap(
        address sellToken,
        address buyToken,
        uint256 sellAmount,
        uint256 minBuyAmount,
        address recipient
    ) external {
        MockERC20(sellToken).transferFrom(msg.sender, address(this), sellAmount);

        // Get real-time price from Chainlink
        (, int256 answer,,,) = priceFeed.latestRoundData();
        require(answer > 0, "INVALID_PRICE");
        uint8 feedDec = priceFeed.decimals(); // 8

        uint256 buyAmount;
        uint8 sellDec = MockERC20(sellToken).decimals();
        uint8 buyDec  = MockERC20(buyToken).decimals();

        if (sellDec == 6 && buyDec == 18) {
            // USDC → WETH: sellAmount(6dec) / ethPrice(feedDec) → WETH(18dec)
            // buyAmount = sellAmount * 10^18 / (ethPrice * 10^(6 + 18 - feedDec - 18))
            // = sellAmount * 10^18 / (ethPrice * 10^(6-feedDec))
            // With feedDec=8: = sellAmount * 10^18 * 10^(feedDec-6) / ethPrice
            //                = sellAmount * 10^18 * 10^2 / ethPrice
            buyAmount = (sellAmount * 1e18 * (10 ** feedDec)) / (uint256(answer) * 1e6);
        } else if (sellDec == 18 && buyDec == 6) {
            // WETH → USDC: sellAmount(18dec) * ethPrice(feedDec) → USDC(6dec)
            buyAmount = (sellAmount * uint256(answer) * 1e6) / (1e18 * (10 ** feedDec));
        } else {
            buyAmount = sellAmount; // same decimals fallback
        }

        require(buyAmount >= minBuyAmount, "SLIPPAGE");
        MockERC20(buyToken).mint(recipient, buyAmount);
    }
}
