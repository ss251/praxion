// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "./lib/Ownable.sol";

contract PraxionPolicy is Ownable {
    struct Constraints {
        uint256 maxTradeNotionalUsd6;
        uint16  maxSlippageBps;
        uint16  maxPositionBps;
        uint32  cooldownSeconds;
        bool    onlyAllowedAssets;
        uint256 agentStakeRequired;
        uint16  slashBpsOnReject;
    }

    mapping(address => Constraints) internal _constraints;
    mapping(address => mapping(address => bool)) internal _allowedAsset;

    event ConstraintsSet(address indexed vault, Constraints constraints);
    event AllowedAssetSet(address indexed vault, address indexed asset, bool allowed);

    function constraints(address vault) external view returns (Constraints memory) { return _constraints[vault]; }
    function isAllowedAsset(address vault, address asset) external view returns (bool) { return _allowedAsset[vault][asset]; }

    function setConstraints(address vault, Constraints calldata c) external onlyOwner {
        require(vault != address(0), "BAD_VAULT");
        require(c.maxSlippageBps <= 10_000, "BAD_SLIPPAGE");
        require(c.maxPositionBps <= 10_000, "BAD_EXPOSURE");
        require(c.slashBpsOnReject <= 10_000, "BAD_SLASH");
        _constraints[vault] = c;
        emit ConstraintsSet(vault, c);
    }

    function setAllowedAsset(address vault, address asset, bool allowed) external onlyOwner {
        require(vault != address(0), "BAD_VAULT");
        require(asset != address(0), "BAD_ASSET");
        _allowedAsset[vault][asset] = allowed;
        emit AllowedAssetSet(vault, asset, allowed);
    }
}
