// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {MockERC20} from "./MockERC20.sol";

/// @dev Mock DEX router: swaps at configurable USDC-per-WETH price
contract MockRouter {
    address public owner;
    uint256 public price; // USDC per WETH (no decimals, e.g. 1960)

    modifier onlyOwner() {
        require(msg.sender == owner, "ONLY_OWNER");
        _;
    }

    constructor(uint256 _price) {
        owner = msg.sender;
        price = _price;
    }

    function setPrice(uint256 _price) external onlyOwner {
        require(_price > 0, "ZERO_PRICE");
        price = _price;
    }

    function swap(
        address sellToken,
        address buyToken,
        uint256 sellAmount,
        uint256 minBuyAmount,
        address recipient
    ) external {
        MockERC20(sellToken).transferFrom(msg.sender, address(this), sellAmount);

        uint256 buyAmount;
        uint8 sellDec = MockERC20(sellToken).decimals();
        uint8 buyDec  = MockERC20(buyToken).decimals();

        if (sellDec == 6 && buyDec == 18) {
            // USDC → WETH: sellAmount(6dec) / price → WETH(18dec)
            buyAmount = (sellAmount * 1e18) / (price * 1e6);
        } else if (sellDec == 18 && buyDec == 6) {
            // WETH → USDC: sellAmount(18dec) * price → USDC(6dec)
            buyAmount = (sellAmount * price * 1e6) / 1e18;
        } else {
            buyAmount = sellAmount; // same decimals fallback
        }

        require(buyAmount >= minBuyAmount, "SLIPPAGE");
        MockERC20(buyToken).mint(recipient, buyAmount);
    }
}
