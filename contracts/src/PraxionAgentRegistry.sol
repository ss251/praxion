// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "./lib/Ownable.sol";
import {IERC20}  from "./lib/IERC20.sol";

contract PraxionAgentRegistry is Ownable {
    IERC20  public immutable stakeToken;
    uint256 public minStake;

    mapping(address => uint256) public stakeOf;
    mapping(address => bool)    public allowlisted;
    mapping(address => bool)    public isSlasher;

    event Staked(address indexed agent, uint256 amount);
    event Unstaked(address indexed agent, uint256 amount);
    event Slashed(address indexed agent, uint256 amount, string reason);
    event AllowlistSet(address indexed agent, bool allowed);
    event SlasherSet(address indexed slasher, bool allowed);
    event MinStakeSet(uint256 newMin);

    modifier onlySlasher() {
        require(isSlasher[msg.sender], "ONLY_SLASHER");
        _;
    }

    constructor(address _stakeToken, uint256 _minStake) {
        stakeToken = IERC20(_stakeToken);
        minStake = _minStake;
    }

    function isActiveAgent(address agent) external view returns (bool) {
        return allowlisted[agent] && stakeOf[agent] >= minStake;
    }

    function stake(uint256 amount) external {
        require(amount > 0, "ZERO_AMOUNT");
        _safeTransferFrom(address(stakeToken), msg.sender, address(this), amount);
        stakeOf[msg.sender] += amount;
        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external {
        require(amount > 0, "ZERO_AMOUNT");
        require(stakeOf[msg.sender] >= amount, "INSUFFICIENT_STAKE");
        stakeOf[msg.sender] -= amount;
        _safeTransfer(address(stakeToken), msg.sender, amount);
        emit Unstaked(msg.sender, amount);
    }

    function slash(address agent, uint256 amount, string calldata reason) external onlySlasher {
        uint256 actual = amount > stakeOf[agent] ? stakeOf[agent] : amount;
        if (actual == 0) return;
        stakeOf[agent] -= actual;
        // send slashed tokens to owner (treasury)
        _safeTransfer(address(stakeToken), owner, actual);
        emit Slashed(agent, actual, reason);
    }

    function setAllowlisted(address agent, bool allowed) external onlyOwner {
        allowlisted[agent] = allowed;
        emit AllowlistSet(agent, allowed);
    }

    function setSlasher(address slasher, bool allowed) external onlyOwner {
        isSlasher[slasher] = allowed;
        emit SlasherSet(slasher, allowed);
    }

    function setMinStake(uint256 _minStake) external onlyOwner {
        minStake = _minStake;
        emit MinStakeSet(_minStake);
    }

    // ── safe helpers ──
    function _safeTransfer(address token, address to, uint256 value) internal {
        (bool ok, bytes memory data) = token.call(abi.encodeWithSelector(IERC20.transfer.selector, to, value));
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "TRANSFER_FAILED");
    }

    function _safeTransferFrom(address token, address from, address to, uint256 value) internal {
        (bool ok, bytes memory data) = token.call(abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, value));
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "TRANSFER_FROM_FAILED");
    }
}
