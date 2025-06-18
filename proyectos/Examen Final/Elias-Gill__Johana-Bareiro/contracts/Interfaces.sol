// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICollateralToken {
    function mint(address to, uint256 amount) external;
    function transferOwnership(address newOwner) external;
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface ILoanToken {
    function mint(address to, uint256 amount) external;
    function transferOwnership(address newOwner) external;
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}
