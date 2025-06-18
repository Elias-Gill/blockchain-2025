// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EvilToken {
    function transferFrom(address, address, uint256) external pure returns (bool) {
        return false; // Simula un fallo
    }

    function transfer(address, uint256) external pure returns (bool) {
        return false; // Simula un fallo
    }

    function approve(address, uint256) external pure returns (bool) {
        return true;
    }

    function balanceOf(address) external pure returns (uint256) {
        return 1e18;
    }
}
