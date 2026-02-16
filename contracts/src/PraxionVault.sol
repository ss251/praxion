// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20}                from "./lib/IERC20.sol";
import {PraxionPolicy}         from "./PraxionPolicy.sol";
import {PraxionSettlement}     from "./PraxionSettlement.sol";
import {PraxionAgentRegistry}  from "./PraxionAgentRegistry.sol";

contract PraxionVault {
    // ── Custom errors ──
    error REPORT_NOT_APPROVED();
    error REPORT_MISMATCH();
    error REPORT_EXPIRED();
    error REPORT_REUSED();
    error AGENT_INACTIVE();
    error COOLDOWN();

    // ── Minimal ERC20 shares ──
    string  public constant name     = "Praxion Vault Share";
    string  public constant symbol   = "pxVAULT";
    uint8   public constant decimals = 6;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;

    event Transfer(address indexed from, address indexed to, uint256 value);

    // ── External deps ──
    IERC20 public immutable usdc;
    IERC20 public immutable weth;
    PraxionPolicy public immutable policy;
    PraxionSettlement public immutable settlement;
    PraxionAgentRegistry public immutable registry;
    address public immutable router;

    // ── State ──
    mapping(bytes32 => bool) public reportUsed;
    mapping(address => uint256) public lastTradeTime;

    // price for WETH deposits (USDC per WETH, 6 decimals)
    uint256 public wethPriceUsd6 = 3000e6;

    event Deposited(address indexed user, address indexed token, uint256 amount, uint256 shares);
    event Withdrawn(address indexed user, uint256 shares, uint256 usdcOut);
    event TradeExecuted(bytes32 indexed reportId, address indexed agent);

    constructor(
        address _usdc,
        address _weth,
        address _policy,
        address _settlement,
        address _registry,
        address _router
    ) {
        usdc       = IERC20(_usdc);
        weth       = IERC20(_weth);
        policy     = PraxionPolicy(_policy);
        settlement = PraxionSettlement(_settlement);
        registry   = PraxionAgentRegistry(_registry);
        router     = _router;
    }

    // ── Deposits ──
    function depositUSDC(uint256 amount) external {
        require(amount > 0, "ZERO");
        _safeTransferFrom(address(usdc), msg.sender, address(this), amount);
        // 1:1 shares for USDC (both 6 decimals)
        _mint(msg.sender, amount);
        emit Deposited(msg.sender, address(usdc), amount, amount);
    }

    function depositWETH(uint256 amount) external {
        require(amount > 0, "ZERO");
        _safeTransferFrom(address(weth), msg.sender, address(this), amount);
        // Convert WETH amount (18 dec) to USDC-equivalent shares (6 dec)
        uint256 shares = (amount * wethPriceUsd6) / 1e18;
        _mint(msg.sender, shares);
        emit Deposited(msg.sender, address(weth), amount, shares);
    }

    function withdrawUSDC(uint256 shares) external {
        require(shares > 0, "ZERO");
        require(balanceOf[msg.sender] >= shares, "INSUFFICIENT_SHARES");
        _burn(msg.sender, shares);
        // 1:1 shares to USDC
        _safeTransfer(address(usdc), msg.sender, shares);
        emit Withdrawn(msg.sender, shares, shares);
    }

    // ── Trade execution (agent-gated) ──
    function executeTrade(
        PraxionSettlement.TradeIntent calldata intent,
        bytes32 reportId,
        address agent
    ) external {
        // 1. Agent active
        if (!registry.isActiveAgent(agent)) revert AGENT_INACTIVE();

        // 2. Cooldown
        uint32 cd = policy.constraints(address(this)).cooldownSeconds;
        if (block.timestamp < lastTradeTime[agent] + cd) revert COOLDOWN();

        // 3. Get report
        PraxionSettlement.TradeReport memory r = settlement.getReport(reportId);
        require(r.exists, "NO_REPORT");

        // 4. Verdict
        if (r.verdict != PraxionSettlement.Verdict.APPROVE) revert REPORT_NOT_APPROVED();

        // 5. Match
        if (
            r.vault != address(this) ||
            r.agent != agent ||
            r.intent.sellToken != intent.sellToken ||
            r.intent.buyToken != intent.buyToken ||
            r.intent.sellAmount != intent.sellAmount ||
            r.intent.minBuyAmount != intent.minBuyAmount ||
            r.intent.deadline != intent.deadline
        ) revert REPORT_MISMATCH();

        // 6. Deadline
        if (block.timestamp > intent.deadline) revert REPORT_EXPIRED();

        // 7. Replay
        if (reportUsed[reportId]) revert REPORT_REUSED();
        reportUsed[reportId] = true;

        // 8. Execute swap via router
        lastTradeTime[agent] = block.timestamp;
        _safeApprove(intent.sellToken, router, intent.sellAmount);
        // Simple swap call: transferFrom sell tokens, transfer buy tokens back
        (bool ok,) = router.call(
            abi.encodeWithSignature(
                "swap(address,address,uint256,uint256,address)",
                intent.sellToken,
                intent.buyToken,
                intent.sellAmount,
                intent.minBuyAmount,
                address(this)
            )
        );
        require(ok, "SWAP_FAILED");

        emit TradeExecuted(reportId, agent);
    }

    // ── Internal ──
    function _mint(address to, uint256 amount) internal {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function _burn(address from, uint256 amount) internal {
        balanceOf[from] -= amount;
        totalSupply -= amount;
        emit Transfer(from, address(0), amount);
    }

    function _safeTransfer(address token, address to, uint256 value) internal {
        (bool ok, bytes memory data) = token.call(abi.encodeWithSelector(IERC20.transfer.selector, to, value));
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "TRANSFER_FAILED");
    }

    function _safeTransferFrom(address token, address from, address to, uint256 value) internal {
        (bool ok, bytes memory data) = token.call(abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, value));
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "TRANSFER_FROM_FAILED");
    }

    function _safeApprove(address token, address spender, uint256 value) internal {
        (bool ok, bytes memory data) = token.call(abi.encodeWithSelector(IERC20.approve.selector, spender, value));
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "APPROVE_FAILED");
    }
}
