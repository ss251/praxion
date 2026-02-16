// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

abstract contract Ownable {
    address public owner;
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);
    modifier onlyOwner() { require(msg.sender == owner, "ONLY_OWNER"); _; }
    constructor() { owner = msg.sender; emit OwnershipTransferred(address(0), msg.sender); }
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "BAD_OWNER");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
