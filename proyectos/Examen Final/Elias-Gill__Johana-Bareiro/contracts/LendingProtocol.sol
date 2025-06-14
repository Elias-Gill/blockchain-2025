// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Token para el colateral (ej. cUSD)
contract CollateralToken is ERC20, Ownable {
    constructor() ERC20("CollateralToken", "cUSD") {}

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}

// Token para el préstamo (ej. dDAI)
contract LoanToken is ERC20, Ownable {
    constructor() ERC20("LoanToken", "dDAI") {}

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}

contract LendingProtocol {
    // Tokens
    CollateralToken public collateralToken;
    LoanToken public loanToken;
    
    // Configuración de intereses
    uint256 public constant INTEREST_RATE = 5; // 5% semanal
    uint256 public constant MAX_LOAN_TO_VALUE = 66; // 66% del colateral
    
    // Datos del usuario
    struct UserData {
        uint256 collateralBalance;
        uint256 loanBalance;
        uint256 interestAccrued;
        uint256 lastInteractionBlock;
    }
    
    mapping(address => UserData) public users;
    
    // Eventos
    event CollateralDeposited(address indexed user, uint256 amount);
    event LoanTaken(address indexed user, uint256 amount);
    event LoanRepaid(address indexed user, uint256 amount);
    event CollateralWithdrawn(address indexed user, uint256 amount);
    
    constructor(address _collateralToken, address _loanToken) {
        collateralToken = CollateralToken(_collateralToken);
        loanToken = LoanToken(_loanToken);
    }
    
    // Función para depositar colateral
    function depositCollateral(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        
        // Transferir tokens de colateral del usuario al contrato
        require(
            collateralToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        // Actualizar el balance del usuario
        UserData storage user = users[msg.sender];
        user.collateralBalance += amount;
        user.lastInteractionBlock = block.number;
        
        emit CollateralDeposited(msg.sender, amount);
    }
    
    // Función para pedir prestado
    function borrow(uint256 amount) external {
        UserData storage user = users[msg.sender];
        
        // Calcular el máximo que puede pedir prestado (66% del colateral)
        uint256 maxBorrow = (user.collateralBalance * MAX_LOAN_TO_VALUE) / 100;
        require(amount <= maxBorrow, "Exceeds maximum borrow amount");
        
        // Asegurarse de que no hay deuda existente
        require(user.loanBalance == 0, "Existing loan must be repaid first");
        
        // Actualizar el balance del usuario
        user.loanBalance = amount;
        user.lastInteractionBlock = block.number;
        
        // Transferir tokens de préstamo al usuario
        loanToken.transfer(msg.sender, amount);
        
        emit LoanTaken(msg.sender, amount);
    }
    
    // Función para pagar el préstamo con interés
    function repay() external {
        UserData storage user = users[msg.sender];
        require(user.loanBalance > 0, "No active loan");
        
        // Calcular interés (simplificado: 5% del monto prestado por "semana" simulada)
        uint256 interest = (user.loanBalance * INTEREST_RATE) / 100;
        uint256 totalToRepay = user.loanBalance + interest;
        
        // Transferir tokens de préstamo de vuelta al contrato
        require(
            loanToken.transferFrom(msg.sender, address(this), totalToRepay),
            "Transfer failed"
        );
        
        // Actualizar el balance del usuario
        user.interestAccrued += interest;
        user.loanBalance = 0;
        user.lastInteractionBlock = block.number;
        
        emit LoanRepaid(msg.sender, totalToRepay);
    }
    
    // Función para retirar colateral
    function withdrawCollateral() external {
        UserData storage user = users[msg.sender];
        require(user.loanBalance == 0, "Active loan exists");
        require(user.collateralBalance > 0, "No collateral to withdraw");
        
        uint256 amount = user.collateralBalance;
        user.collateralBalance = 0;
        
        // Transferir tokens de colateral de vuelta al usuario
        collateralToken.transfer(msg.sender, amount);
        
        emit CollateralWithdrawn(msg.sender, amount);
    }
    
    // Función para obtener datos del usuario
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
    
    // Función auxiliar para calcular el interés acumulado (para pruebas)
    function calculateAccruedInterest(address user) external view returns (uint256) {
        UserData storage userData = users[user];
        if (userData.loanBalance == 0) return 0;
        
        // En un contrato real, usaríamos timestamps, pero para pruebas usamos bloques
        uint256 blocksSinceLastInteraction = block.number - userData.lastInteractionBlock;
        
        // Simulamos que cada 100 bloques es una "semana" para pruebas
        uint256 simulatedWeeks = blocksSinceLastInteraction / 100;
        
        // Calcular interés compuesto (aunque el enunciado pide sin composición)
        uint256 interest = 0;
        uint256 currentDebt = userData.loanBalance;
        
        for (uint i = 0; i < simulatedWeeks; i++) {
            interest += (currentDebt * INTEREST_RATE) / 100;
            currentDebt += (currentDebt * INTEREST_RATE) / 100;
        }
        
        return interest;
    }
}
