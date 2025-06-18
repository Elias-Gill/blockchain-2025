const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
require("dotenv").config();

describe("LendingProtocol", function () {
  async function setupFixture() {
    const [owner, user1, user2] = await ethers.getSigners();

    const CollateralToken = await ethers.getContractFactory(
      "CollateralToken",
      owner
    );
    const collateralToken = await CollateralToken.deploy();
    await collateralToken.waitForDeployment();

    const LoanToken = await ethers.getContractFactory("LoanToken", owner);
    const loanToken = await LoanToken.deploy();
    await loanToken.waitForDeployment();

    const LendingProtocol = await ethers.getContractFactory(
      "LendingProtocol",
      owner
    );
    const lendingProtocol = await LendingProtocol.deploy(
      collateralToken.target,
      loanToken.target
    );
    await lendingProtocol.waitForDeployment();

    const testAmount = ethers.parseEther("1000");
    await collateralToken.mint(owner.address, testAmount);
    await collateralToken.mint(user1.address, testAmount);
    await loanToken.mint(lendingProtocol.target, testAmount);

    return { collateralToken, loanToken, lendingProtocol, owner, user1, user2 };
  }

  describe("Configuración Inicial", function () {
    it("Debería tener las direcciones correctas de los contratos", async function () {
      const { collateralToken, loanToken, lendingProtocol } = await loadFixture(
        setupFixture
      );

      expect(await lendingProtocol.collateralToken()).to.equal(
        collateralToken.address
      );
      expect(await lendingProtocol.loanToken()).to.equal(loanToken.address);
    });
  });

  describe("Funciones de Token", function () {
    it("Debería permitir mint de CollateralToken solo al owner", async function () {
      const { collateralToken, owner, user1 } = await loadFixture(setupFixture);

      // Owner puede mintear
      await collateralToken.mint(user1.address, ethers.parseEther("100"));
      expect(await collateralToken.balanceOf(user1.address)).to.equal(
        ethers.parseEther("100")
      );

      // Usuario no puede mintear
      await expect(
        collateralToken
          .connect(user1)
          .mint(user1.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Debería permitir mint de LoanToken solo al owner", async function () {
      const { loanToken, owner, user1 } = await loadFixture(setupFixture);

      // Owner puede mintear
      await loanToken.mint(user1.address, ethers.parseEther("100"));
      expect(await loanToken.balanceOf(user1.address)).to.equal(
        ethers.parseEther("100")
      );

      // Usuario no puede mintear
      await expect(
        loanToken.connect(user1).mint(user1.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Depósito de Colateral", function () {
    it("Debería permitir depositar colateral", async function () {
      const { collateralToken, lendingProtocol, owner } = await loadFixture(
        setupFixture
      );

      const amount = ethers.parseEther("100");
      await collateralToken.approve(lendingProtocol.address, amount);
      await expect(lendingProtocol.depositCollateral(amount))
        .to.emit(lendingProtocol, "CollateralDeposited")
        .withArgs(owner.address, amount);

      const userData = await lendingProtocol.users(owner.address);
      expect(userData.collateralBalance).to.equal(amount);
    });

    it("No debería permitir depositar 0 tokens", async function () {
      const { lendingProtocol } = await loadFixture(setupFixture);

      await expect(lendingProtocol.depositCollateral(0)).to.be.revertedWith(
        "Amount must be > 0"
      );
    });

    it("No debería permitir depositar sin aprobación", async function () {
      const { lendingProtocol } = await loadFixture(setupFixture);

      await expect(
        lendingProtocol.depositCollateral(ethers.parseEther("100"))
      ).to.be.revertedWith("Transfer failed");
    });
  });

  describe("Solicitud de Préstamo", function () {
    it("Debería permitir pedir préstamo con colateral suficiente", async function () {
      const { collateralToken, loanToken, lendingProtocol, owner } =
        await loadFixture(setupFixture);

      const collateralAmount = ethers.parseEther("150");
      await collateralToken.approve(lendingProtocol.address, collateralAmount);
      await lendingProtocol.depositCollateral(collateralAmount);

      const loanAmount = ethers.parseEther("100");
      await expect(lendingProtocol.borrow(loanAmount))
        .to.emit(lendingProtocol, "LoanTaken")
        .withArgs(owner.address, loanAmount);

      expect(await loanToken.balanceOf(owner.address)).to.equal(loanAmount);
      const userData = await lendingProtocol.users(owner.address);
      expect(userData.loanBalance).to.equal(loanAmount);
    });

    it("No debería permitir pedir préstamo sin colateral", async function () {
      const { lendingProtocol } = await loadFixture(setupFixture);

      await expect(
        lendingProtocol.borrow(ethers.parseEther("100"))
      ).to.be.revertedWith("Exceeds max borrow amount");
    });

    it("No debería permitir pedir préstamo que exceda el ratio", async function () {
      const { collateralToken, lendingProtocol } = await loadFixture(
        setupFixture
      );

      const collateralAmount = ethers.parseEther("100");
      await collateralToken.approve(lendingProtocol.address, collateralAmount);
      await lendingProtocol.depositCollateral(collateralAmount);

      await expect(
        lendingProtocol.borrow(ethers.parseEther("66.01"))
      ).to.be.revertedWith("Exceeds max borrow amount");
    });

    it("No debería permitir pedir préstamo con deuda existente", async function () {
      const { collateralToken, lendingProtocol } = await loadFixture(
        setupFixture
      );

      const collateralAmount = ethers.parseEther("300");
      await collateralToken.approve(lendingProtocol.address, collateralAmount);
      await lendingProtocol.depositCollateral(collateralAmount);
      await lendingProtocol.borrow(ethers.parseEther("100"));

      await expect(
        lendingProtocol.borrow(ethers.parseEther("100"))
      ).to.be.revertedWith("Existing loan must be repaid");
    });
  });

  describe("Pago de Préstamo", function () {
    it("Debería permitir pagar préstamo con interés", async function () {
      const { collateralToken, loanToken, lendingProtocol, owner } =
        await loadFixture(setupFixture);

      const collateralAmount = ethers.parseEther("150");
      await collateralToken.approve(lendingProtocol.address, collateralAmount);
      await lendingProtocol.depositCollateral(collateralAmount);
      const loanAmount = ethers.parseEther("100");
      await lendingProtocol.borrow(loanAmount);

      await time.increase(7 * 24 * 60 * 60);

      const interest = await lendingProtocol.calculateCurrentInterest(
        owner.address
      );
      const totalToRepay = loanAmount.add(interest);

      await loanToken.approve(lendingProtocol.address, totalToRepay);
      await expect(lendingProtocol.repay())
        .to.emit(lendingProtocol, "LoanRepaid")
        .withArgs(owner.address, totalToRepay);

      const userData = await lendingProtocol.users(owner.address);
      expect(userData.loanBalance).to.equal(0);
      expect(userData.interestAccrued).to.equal(interest);
    });

    it("No debería permitir pagar préstamo sin deuda", async function () {
      const { lendingProtocol } = await loadFixture(setupFixture);

      await expect(lendingProtocol.repay()).to.be.revertedWith(
        "No active loan"
      );
    });

    it("No debería permitir pagar préstamo sin aprobación", async function () {
      const { collateralToken, lendingProtocol } = await loadFixture(
        setupFixture
      );

      const collateralAmount = ethers.parseEther("150");
      await collateralToken.approve(lendingProtocol.address, collateralAmount);
      await lendingProtocol.depositCollateral(collateralAmount);
      await lendingProtocol.borrow(ethers.parseEther("100"));

      await expect(lendingProtocol.repay()).to.be.revertedWith(
        "Transfer failed"
      );
    });
  });

  describe("Retiro de Colateral", function () {
    it("Debería permitir retirar colateral sin deuda", async function () {
      const { collateralToken, lendingProtocol, owner } = await loadFixture(
        setupFixture
      );

      const amount = ethers.parseEther("100");
      await collateralToken.approve(lendingProtocol.address, amount);
      await lendingProtocol.depositCollateral(amount);

      await expect(lendingProtocol.withdrawCollateral())
        .to.emit(lendingProtocol, "CollateralWithdrawn")
        .withArgs(owner.address, amount);

      // Verificar balance razonable (permite variación)
      const balance = await collateralToken.balanceOf(owner.address);
      expect(balance).to.be.closeTo(
        ethers.parseEther("1000000"),
        ethers.parseEther("1")
      );
    });

    it("No debería permitir retirar colateral con deuda pendiente", async function () {
      const { collateralToken, lendingProtocol } = await loadFixture(
        setupFixture
      );

      const collateralAmount = ethers.parseEther("150");
      await collateralToken.approve(lendingProtocol.address, collateralAmount);
      await lendingProtocol.depositCollateral(collateralAmount);
      await lendingProtocol.borrow(ethers.parseEther("100"));

      await expect(lendingProtocol.withdrawCollateral()).to.be.revertedWith(
        "Active loan exists"
      );
    });

    it("No debería permitir retirar sin colateral", async function () {
      const { lendingProtocol } = await loadFixture(setupFixture);

      await expect(lendingProtocol.withdrawCollateral()).to.be.revertedWith(
        "No collateral to withdraw"
      );
    });
  });

  describe("Cálculo de Interés", function () {
    it("Debería calcular interés correctamente", async function () {
      const { collateralToken, lendingProtocol, owner } = await loadFixture(
        setupFixture
      );

      const collateralAmount = ethers.parseEther("150");
      await collateralToken.approve(lendingProtocol.address, collateralAmount);
      await lendingProtocol.depositCollateral(collateralAmount);
      const loanAmount = ethers.parseEther("100");
      await lendingProtocol.borrow(loanAmount);

      await time.increase(7 * 24 * 60 * 60);

      const interest = await lendingProtocol.calculateCurrentInterest(
        owner.address
      );
      expect(interest).to.equal(ethers.parseEther("5"));

      await time.increase(7 * 24 * 60 * 60);
      const newInterest = await lendingProtocol.calculateCurrentInterest(
        owner.address
      );
      expect(newInterest).to.equal(ethers.parseEther("10.25"));
    });

    it("Debería devolver 0 si no hay préstamo", async function () {
      const { lendingProtocol, owner } = await loadFixture(setupFixture);

      expect(
        await lendingProtocol.calculateCurrentInterest(owner.address)
      ).to.equal(0);
    });
  });

  describe("Datos de Usuario", function () {
    it("Debería devolver los datos correctos del usuario", async function () {
      const { collateralToken, lendingProtocol, owner } = await loadFixture(
        setupFixture
      );

      const collateralAmount = ethers.parseEther("150");
      await collateralToken.approve(lendingProtocol.address, collateralAmount);
      await lendingProtocol.depositCollateral(collateralAmount);

      let [collateral, loan, interest] = await lendingProtocol.getUserData(
        owner.address
      );
      expect(collateral).to.equal(collateralAmount);
      expect(loan).to.equal(0);
      expect(interest).to.equal(0);

      const loanAmount = ethers.parseEther("100");
      await lendingProtocol.borrow(loanAmount);

      [collateral, loan, interest] = await lendingProtocol.getUserData(
        owner.address
      );
      expect(collateral).to.equal(collateralAmount);
      expect(loan).to.equal(loanAmount);
      expect(interest).to.equal(0);
    });
  });

  describe("Ratio de Colateralización", function () {
    it("Debería calcular el ratio correctamente", async function () {
      const { collateralToken, lendingProtocol, owner } = await loadFixture(
        setupFixture
      );

      const collateralAmount = ethers.parseEther("150");
      await collateralToken.approve(lendingProtocol.address, collateralAmount);
      await lendingProtocol.depositCollateral(collateralAmount);

      // Sin préstamo
      expect(await lendingProtocol.getCollateralRatio(owner.address)).to.equal(
        ethers.MaxUint256
      );

      const loanAmount = ethers.parseEther("100");
      await lendingProtocol.borrow(loanAmount);

      // Aquí asumo que getCollateralRatio devuelve porcentaje como número (150%)
      expect(await lendingProtocol.getCollateralRatio(owner.address)).to.equal(
        150
      );
    });
  });
});
