// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract LendingProtocol is Ownable, ReentrancyGuard {
    IERC20 public immutable collateralToken;
    IERC20 public immutable loanToken;
    
    uint256 public constant INTEREST_RATE = 5; // 5%
    uint256 public constant COLLATERAL_RATIO = 150; // 150%
    uint256 public constant INTEREST_PERIOD = 1 weeks;
    
    struct UserData {
        uint256 collateralBalance;
        uint256 loanBalance;
        uint256 interestAccrued;
        uint256 lastInteractionTime;
    }
    
    mapping(address => UserData) public users;
    
    event CollateralDeposited(address indexed user, uint256 amount);
    event LoanTaken(address indexed user, uint256 amount);
    event LoanRepaid(address indexed user, uint256 amount);
    event CollateralWithdrawn(address indexed user, uint256 amount);
    
    constructor(address _collateralToken, address _loanToken) Ownable(msg.sender) {
        require(_collateralToken != address(0) && _loanToken != address(0), "Invalid token address");
        collateralToken = IERC20(_collateralToken);
        loanToken = IERC20(_loanToken);
    }
    
    function depositCollateral(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        bool success = collateralToken.transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer failed");
        
        UserData storage user = users[msg.sender];
        user.collateralBalance += amount;
        user.lastInteractionTime = block.timestamp;
        
        emit CollateralDeposited(msg.sender, amount);
    }
    
    function borrow(uint256 amount) external nonReentrant {
        UserData storage user = users[msg.sender];
        uint256 maxBorrow = (user.collateralBalance * 100) / COLLATERAL_RATIO;
        
        require(amount > 0, "Amount must be > 0");
        require(amount <= maxBorrow, "Exceeds max borrow amount");
        require(user.loanBalance == 0, "Existing loan must be repaid");
        require(loanToken.balanceOf(address(this)) >= amount, "Insufficient protocol funds");
        
        user.loanBalance = amount;
        user.lastInteractionTime = block.timestamp;
        bool success = loanToken.transfer(msg.sender, amount);
        require(success, "Transfer failed");
        
        emit LoanTaken(msg.sender, amount);
    }
    
    function repay() external nonReentrant {
        UserData storage user = users[msg.sender];
        require(user.loanBalance > 0, "No active loan");
        
        uint256 interest = calculateCurrentInterest(msg.sender);
        uint256 totalToRepay = user.loanBalance + interest;
        
        bool success = loanToken.transferFrom(msg.sender, address(this), totalToRepay);
        require(success, "Transfer failed");
        
        user.interestAccrued += interest;
        user.loanBalance = 0;
        user.lastInteractionTime = block.timestamp;
        
        emit LoanRepaid(msg.sender, totalToRepay);
    }
    
    function withdrawCollateral() external nonReentrant {
        UserData storage user = users[msg.sender];
        require(user.loanBalance == 0, "Active loan exists");
        require(user.collateralBalance > 0, "No collateral to withdraw");
        
        uint256 amount = user.collateralBalance;
        user.collateralBalance = 0;
        bool success = collateralToken.transfer(msg.sender, amount);
        require(success, "Transfer failed");
        
        emit CollateralWithdrawn(msg.sender, amount);
    }
    
    function calculateCurrentInterest(address user) public view returns (uint256) {
        UserData storage userData = users[user];
        if (userData.loanBalance == 0) return 0;
        
        uint256 timeElapsed = block.timestamp - userData.lastInteractionTime;
        uint256 periods = timeElapsed / INTEREST_PERIOD;
        
        if (periods == 0) return 0;
        
        uint256 interest = 0;
        uint256 principal = userData.loanBalance;
        for (uint i = 0; i < periods; i++) {
            uint256 periodInterest = (principal * INTEREST_RATE) / 100;
            interest += periodInterest;
            principal += periodInterest;
        }
        return interest;
    }
    
    function getUserData(address user) external view returns (
        uint256 collateralBalance,
        uint256 loanBalance,
        uint256 interestAccrued
    ) {
        UserData storage userData = users[user];
        return (
            userData.collateralBalance,
            userData.loanBalance,
            userData.interestAccrued
        );
    }
    
    function getCollateralRatio(address user) external view returns (uint256) {
        UserData storage userData = users[user];
        if (userData.loanBalance == 0) return type(uint256).max;
        return (userData.collateralBalance * 100) / userData.loanBalance;
    }
}
