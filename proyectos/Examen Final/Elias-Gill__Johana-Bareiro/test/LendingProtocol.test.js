const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("LendingProtocol", function () {
  async function deployContractsFixture() {
    const [owner, user1, user2] = await ethers.getSigners();

    // Deploy tokens
    const CollateralToken = await ethers.getContractFactory("CollateralToken");
    const collateralToken = await CollateralToken.deploy();
    await collateralToken.deployed();

    const LoanToken = await ethers.getContractFactory("LoanToken");
    const loanToken = await LoanToken.deploy();
    await loanToken.deployed();

    // Deploy lending protocol
    const LendingProtocol = await ethers.getContractFactory("LendingProtocol");
    const lendingProtocol = await LendingProtocol.deploy(
      collateralToken.address,
      loanToken.address
    );
    await lendingProtocol.deployed();

    // Mint collateral tokens to users for testing
    await collateralToken.mint(user1.address, ethers.utils.parseEther("1000"));
    await collateralToken.mint(user2.address, ethers.utils.parseEther("1000"));

    // Give lending protocol minting rights for loan token
    await loanToken.transferOwnership(lendingProtocol.address);

    return { collateralToken, loanToken, lendingProtocol, owner, user1, user2 };
  }

  describe("Token Deployment", function () {
    it("Should deploy CollateralToken with correct name and symbol", async function () {
      const { collateralToken } = await loadFixture(deployContractsFixture);
      expect(await collateralToken.name()).to.equal("CollateralToken");
      expect(await collateralToken.symbol()).to.equal("cUSD");
    });

    it("Should deploy LoanToken with correct name and symbol", async function () {
      const { loanToken } = await loadFixture(deployContractsFixture);
      expect(await loanToken.name()).to.equal("LoanToken");
      expect(await loanToken.symbol()).to.equal("dDAI");
    });
  });

  describe("Deposit Collateral", function () {
    it("Should allow users to deposit collateral", async function () {
      const { collateralToken, lendingProtocol, user1 } = await loadFixture(
        deployContractsFixture
      );

      const amount = ethers.utils.parseEther("100");
      await collateralToken.connect(user1).approve(lendingProtocol.address, amount);
      await expect(lendingProtocol.connect(user1).depositCollateral(amount))
        .to.emit(lendingProtocol, "CollateralDeposited")
        .withArgs(user1.address, amount);

      const userData = await lendingProtocol.getUserData(user1.address);
      expect(userData.collateralBalance).to.equal(amount);
    });

    it("Should fail when depositing zero amount", async function () {
      const { lendingProtocol, user1 } = await loadFixture(deployContractsFixture);
      await expect(
        lendingProtocol.connect(user1).depositCollateral(0)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should fail when transfer fails", async function () {
      const { lendingProtocol, user1 } = await loadFixture(deployContractsFixture);
      const amount = ethers.utils.parseEther("100");
      await expect(
        lendingProtocol.connect(user1).depositCollateral(amount)
      ).to.be.revertedWith("Transfer failed");
    });
  });

  describe("Borrow", function () {
    it("Should allow users to borrow up to 66% of collateral", async function () {
      const { collateralToken, lendingProtocol, loanToken, user1 } =
        await loadFixture(deployContractsFixture);

      // Deposit collateral
      const depositAmount = ethers.utils.parseEther("100");
      await collateralToken.connect(user1).approve(lendingProtocol.address, depositAmount);
      await lendingProtocol.connect(user1).depositCollateral(depositAmount);

      // Calculate max borrow (66% of collateral)
      const maxBorrow = depositAmount.mul(66).div(100);
      await expect(lendingProtocol.connect(user1).borrow(maxBorrow))
        .to.emit(lendingProtocol, "LoanTaken")
        .withArgs(user1.address, maxBorrow);

      // Check loan token balance
      expect(await loanToken.balanceOf(user1.address)).to.equal(maxBorrow);

      // Check user data
      const userData = await lendingProtocol.getUserData(user1.address);
      expect(userData.loanBalance).to.equal(maxBorrow);
    });

    it("Should fail when trying to borrow more than 66% of collateral", async function () {
      const { collateralToken, lendingProtocol, user1 } = await loadFixture(
        deployContractsFixture
      );

      // Deposit collateral
      const depositAmount = ethers.utils.parseEther("100");
      await collateralToken.connect(user1).approve(lendingProtocol.address, depositAmount);
      await lendingProtocol.connect(user1).depositCollateral(depositAmount);

      // Try to borrow more than allowed
      const invalidBorrow = depositAmount.mul(67).div(100);
      await expect(
        lendingProtocol.connect(user1).borrow(invalidBorrow)
      ).to.be.revertedWith("Exceeds maximum borrow amount");
    });

    it("Should fail when trying to borrow with existing loan", async function () {
      const { collateralToken, lendingProtocol, user1 } = await loadFixture(
        deployContractsFixture
      );

      // Deposit and borrow once
      const depositAmount = ethers.utils.parseEther("100");
      await collateralToken.connect(user1).approve(lendingProtocol.address, depositAmount);
      await lendingProtocol.connect(user1).depositCollateral(depositAmount);
      const borrowAmount = depositAmount.mul(50).div(100);
      await lendingProtocol.connect(user1).borrow(borrowAmount);

      // Try to borrow again
      await expect(
        lendingProtocol.connect(user1).borrow(borrowAmount)
      ).to.be.revertedWith("Existing loan must be repaid first");
    });

    it("Should fail when trying to borrow without collateral", async function () {
      const { lendingProtocol, user1 } = await loadFixture(deployContractsFixture);
      await expect(
        lendingProtocol.connect(user1).borrow(ethers.utils.parseEther("10"))
      ).to.be.revertedWith("Exceeds maximum borrow amount");
    });
  });

  describe("Repay", function () {
    it("Should allow users to repay loans with interest", async function () {
      const { collateralToken, lendingProtocol, loanToken, user1 } =
        await loadFixture(deployContractsFixture);

      // Deposit and borrow
      const depositAmount = ethers.utils.parseEther("100");
      await collateralToken.connect(user1).approve(lendingProtocol.address, depositAmount);
      await lendingProtocol.connect(user1).depositCollateral(depositAmount);
      const borrowAmount = depositAmount.mul(50).div(100);
      await lendingProtocol.connect(user1).borrow(borrowAmount);

      // Approve repayment (amount + 5% interest)
      const repayAmount = borrowAmount.mul(105).div(100);
      await loanToken.connect(user1).approve(lendingProtocol.address, repayAmount);

      // Repay
      await expect(lendingProtocol.connect(user1).repay())
        .to.emit(lendingProtocol, "LoanRepaid")
        .withArgs(user1.address, repayAmount);

      // Check user data
      const userData = await lendingProtocol.getUserData(user1.address);
      expect(userData.loanBalance).to.equal(0);
      expect(userData.interestAccrued).to.equal(borrowAmount.mul(5).div(100));
    });

    it("Should fail when trying to repay with no active loan", async function () {
      const { lendingProtocol, user1 } = await loadFixture(deployContractsFixture);
      await expect(lendingProtocol.connect(user1).repay()).to.be.revertedWith(
        "No active loan"
      );
    });

    it("Should fail when transfer fails during repayment", async function () {
      const { collateralToken, lendingProtocol, user1 } = await loadFixture(
        deployContractsFixture
      );

      // Deposit and borrow
      const depositAmount = ethers.utils.parseEther("100");
      await collateralToken.connect(user1).approve(lendingProtocol.address, depositAmount);
      await lendingProtocol.connect(user1).depositCollateral(depositAmount);
      const borrowAmount = depositAmount.mul(50).div(100);
      await lendingProtocol.connect(user1).borrow(borrowAmount);

      // Try to repay without approval
      await expect(lendingProtocol.connect(user1).repay()).to.be.revertedWith(
        "Transfer failed"
      );
    });
  });

  describe("Withdraw Collateral", function () {
    it("Should allow users to withdraw collateral when no debt", async function () {
      const { collateralToken, lendingProtocol, user1 } = await loadFixture(
        deployContractsFixture
      );

      // Deposit
      const depositAmount = ethers.utils.parseEther("100");
      await collateralToken.connect(user1).approve(lendingProtocol.address, depositAmount);
      await lendingProtocol.connect(user1).depositCollateral(depositAmount);

      // Withdraw
      await expect(lendingProtocol.connect(user1).withdrawCollateral())
        .to.emit(lendingProtocol, "CollateralWithdrawn")
        .withArgs(user1.address, depositAmount);

      // Check user data
      const userData = await lendingProtocol.getUserData(user1.address);
      expect(userData.collateralBalance).to.equal(0);
    });

    it("Should fail when trying to withdraw with active loan", async function () {
      const { collateralToken, lendingProtocol, user1 } = await loadFixture(
        deployContractsFixture
      );

      // Deposit and borrow
      const depositAmount = ethers.utils.parseEther("100");
      await collateralToken.connect(user1).approve(lendingProtocol.address, depositAmount);
      await lendingProtocol.connect(user1).depositCollateral(depositAmount);
      const borrowAmount = depositAmount.mul(50).div(100);
      await lendingProtocol.connect(user1).borrow(borrowAmount);

      // Try to withdraw
      await expect(
        lendingProtocol.connect(user1).withdrawCollateral()
      ).to.be.revertedWith("Active loan exists");
    });

    it("Should fail when trying to withdraw with no collateral", async function () {
      const { lendingProtocol, user1 } = await loadFixture(deployContractsFixture);
      await expect(
        lendingProtocol.connect(user1).withdrawCollateral()
      ).to.be.revertedWith("No collateral to withdraw");
    });
  });

  describe("Interest Calculation", function () {
    it("Should calculate accrued interest correctly", async function () {
      const { collateralToken, lendingProtocol, loanToken, user1 } =
        await loadFixture(deployContractsFixture);

      // Deposit and borrow
      const depositAmount = ethers.utils.parseEther("100");
      await collateralToken.connect(user1).approve(lendingProtocol.address, depositAmount);
      await lendingProtocol.connect(user1).depositCollateral(depositAmount);
      const borrowAmount = depositAmount.mul(50).div(100);
      await lendingProtocol.connect(user1).borrow(borrowAmount);

      // Mine some blocks to simulate time passing
      for (let i = 0; i < 100; i++) {
        await ethers.provider.send("evm_mine", []);
      }

      // Check interest (should be 5% after 100 blocks)
      const interest = await lendingProtocol.calculateAccruedInterest(user1.address);
      expect(interest).to.equal(borrowAmount.mul(5).div(100));
    });

    it("Should return zero interest when no active loan", async function () {
      const { lendingProtocol, user1 } = await loadFixture(deployContractsFixture);
      const interest = await lendingProtocol.calculateAccruedInterest(user1.address);
      expect(interest).to.equal(0);
    });
  });

  describe("User Data", function () {
    it("Should return correct user data", async function () {
      const { collateralToken, lendingProtocol, user1 } = await loadFixture(
        deployContractsFixture
      );

      // Initial data should be zeros
      let userData = await lendingProtocol.getUserData(user1.address);
      expect(userData.collateralBalance).to.equal(0);
      expect(userData.loanBalance).to.equal(0);
      expect(userData.interestAccrued).to.equal(0);

      // Deposit
      const depositAmount = ethers.utils.parseEther("100");
      await collateralToken.connect(user1).approve(lendingProtocol.address, depositAmount);
      await lendingProtocol.connect(user1).depositCollateral(depositAmount);

      // Check data after deposit
      userData = await lendingProtocol.getUserData(user1.address);
      expect(userData.collateralBalance).to.equal(depositAmount);
      expect(userData.loanBalance).to.equal(0);
      expect(userData.interestAccrued).to.equal(0);
    });
  });
});
