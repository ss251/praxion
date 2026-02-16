// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {MockERC20} from "./MockERC20.sol";

/// @dev Mock DEX router: swaps at fixed 3000 USDC per WETH
contract MockRouter {
    uint256 public constant PRICE = 3000; // USDC per WETH

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
            // USDC → WETH: sellAmount(6dec) / 3000 → WETH(18dec)
            buyAmount = (sellAmount * 1e18) / (PRICE * 1e6);
        } else if (sellDec == 18 && buyDec == 6) {
            // WETH → USDC: sellAmount(18dec) * 3000 → USDC(6dec)
            buyAmount = (sellAmount * PRICE * 1e6) / 1e18;
        } else {
            buyAmount = sellAmount; // same decimals fallback
        }

        require(buyAmount >= minBuyAmount, "SLIPPAGE");
        MockERC20(buyToken).mint(recipient, buyAmount);
    }
}
