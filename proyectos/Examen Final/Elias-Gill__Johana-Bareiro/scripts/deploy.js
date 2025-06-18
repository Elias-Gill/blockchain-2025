require("dotenv").config();
const fs = require("fs");
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // 1. Desplegar tokens
  console.log("\nDeploying CollateralToken...");
  const CollateralToken = await ethers.getContractFactory("CollateralToken");
  const collateralToken = await CollateralToken.deploy();
  await collateralToken.waitForDeployment();
  const collateralTokenAddress = await collateralToken.getAddress();
  console.log("CollateralToken deployed to:", collateralTokenAddress);

  console.log("\nDeploying LoanToken...");
  const LoanToken = await ethers.getContractFactory("LoanToken");
  const loanToken = await LoanToken.deploy();
  await loanToken.waitForDeployment();
  const loanTokenAddress = await loanToken.getAddress();
  console.log("LoanToken deployed to:", loanTokenAddress);

  // 2. Mintear tokens iniciales
  console.log("\nMinting initial tokens...");
  const initialSupply = ethers.parseEther("1000000");
  
  await (await collateralToken.mint(deployer.address, initialSupply)).wait();
  console.log(`Minted ${ethers.formatEther(initialSupply)} cUSD to deployer`);

  // 3. Desplegar protocolo
  console.log("\nDeploying LendingProtocol...");
  const LendingProtocol = await ethers.getContractFactory("LendingProtocol");
  const lendingProtocol = await LendingProtocol.deploy(
    collateralTokenAddress,
    loanTokenAddress
  );
  await lendingProtocol.waitForDeployment();
  const lendingProtocolAddress = await lendingProtocol.getAddress();
  console.log("LendingProtocol deployed to:", lendingProtocolAddress);

  // 4. Configurar protocolo
  console.log("\nConfiguring protocol...");
  await (await loanToken.mint(lendingProtocolAddress, initialSupply)).wait();
  console.log(`Minted ${ethers.formatEther(initialSupply)} dDAI to protocol`);

  // 5. Transferir ownership (opcional)
  console.log("\nTransferring token ownership to protocol...");
  await (await collateralToken.transferOwnership(lendingProtocolAddress)).wait();
  await (await loanToken.transferOwnership(lendingProtocolAddress)).wait();
  console.log("Ownership transferred");

  // 6. Mintear tokens de prueba
  if (process.env.ENABLE_TEST_TOKENS === "true") {
    console.log("\nMinting test tokens...");
    const accounts = await ethers.getSigners();
    const testAmount = ethers.parseEther("1000");

    for (let i = 1; i < Math.min(accounts.length, 5); i++) {
      await collateralToken.mint(accounts[i].address, testAmount);
      const balance = await collateralToken.balanceOf(accounts[i].address);
      console.log(`Minted to ${accounts[i].address}: ${ethers.formatEther(balance)} cUSD`);
    }
  }

  // 7. Guardar direcciones
  if (process.env.SAVE_DEPLOYMENT === "true") {
    const deploymentInfo = {
      network: (await ethers.provider.getNetwork()).name,
      contracts: {
        CollateralToken: collateralTokenAddress,
        LoanToken: loanTokenAddress,
        LendingProtocol: lendingProtocolAddress,
      },
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync("deployment-info.json", JSON.stringify(deploymentInfo, null, 2));
    console.log("\nDeployment info saved to deployment-info.json");
  }

  console.log("\n✅ Deployment completed successfully!");
}

main().catch((error) => {
  console.error("\n❌ Deployment failed:", error);
  process.exitCode = 1;
});
