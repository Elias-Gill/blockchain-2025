require("dotenv").config();

async function main() {
  // Deployment Setup
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  // Obtener balance de forma compatible con todas las versiones
  let balance;
  try {
    // Intenta con la forma moderna (ethers v6)
    balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH");
  } catch (e) {
    // Fallback para versiones antiguas (ethers v5)
    balance = await deployer.getBalance();
    console.log("Account balance:", ethers.utils.formatEther(balance), "ETH");
  }

  // Deployment Sequence
  console.log("\nStep 1: Deploying Collateral Token (cUSD)...");
  const CollateralToken = await ethers.getContractFactory("CollateralToken");
  const collateralToken = await CollateralToken.deploy();
  
  // Espera la implementación de forma compatible
  try {
    await collateralToken.deployed(); // Para ethers v5
  } catch (e) {
    await collateralToken.waitForDeployment(); // Para ethers v6
  }
  console.log("CollateralToken deployed to:", await getContractAddress(collateralToken));

  console.log("\nStep 2: Deploying Loan Token (dDAI)...");
  const LoanToken = await ethers.getContractFactory("LoanToken");
  const loanToken = await LoanToken.deploy();
  try {
    await loanToken.deployed();
  } catch (e) {
    await loanToken.waitForDeployment();
  }
  console.log("LoanToken deployed to:", await getContractAddress(loanToken));

  console.log("\nStep 3: Deploying Lending Protocol...");
  const LendingProtocol = await ethers.getContractFactory("LendingProtocol");
  const lendingProtocol = await LendingProtocol.deploy(
    await getContractAddress(collateralToken),
    await getContractAddress(loanToken)
  );
  try {
    await lendingProtocol.deployed();
  } catch (e) {
    await lendingProtocol.waitForDeployment();
  }
  console.log("LendingProtocol deployed to:", await getContractAddress(lendingProtocol));

  // Post-Deployment Configuration
  console.log("\nStep 4: Configuring token permissions...");
  console.log("Transferring LoanToken ownership to LendingProtocol...");
  const transferTx = await loanToken.transferOwnership(await getContractAddress(lendingProtocol));
  await transferTx.wait();
  console.log("Ownership transferred successfully");

  // Initial Token Distribution (for testing)
  if (process.env.ENABLE_TEST_TOKENS === "true") {
    console.log("\nStep 5: Minting test tokens...");
    const testAccounts = await ethers.getSigners();
    
    // Skip first account (deployer)
    for (let i = 1; i < Math.min(testAccounts.length, 5); i++) {
      const account = testAccounts[i];
      const amount = parseEther("1000");
      
      console.log(`Minting 1000 cUSD to ${account.address}`);
      const mintTx = await collateralToken.mint(account.address, amount);
      await mintTx.wait();
      
      // Verify balance
      const balance = await collateralToken.balanceOf(account.address);
      console.log(`New balance: ${formatEther(balance)} cUSD`);
    }
  }

  // Verification Summary
  console.log("\nDeployment Summary:");
  console.log("----------------------------------");
  console.log("Collateral Token (cUSD):", await getContractAddress(collateralToken));
  console.log("Loan Token (dDAI):     ", await getContractAddress(loanToken));
  console.log("Lending Protocol:      ", await getContractAddress(lendingProtocol));
  console.log("----------------------------------");

  // Save deployment addresses to a file (optional)
  if (process.env.SAVE_DEPLOYMENT === "true") {
    const fs = require('fs');
    const deploymentInfo = {
      network: (await ethers.provider.getNetwork()).name,
      timestamp: new Date().toISOString(),
      contracts: {
        CollateralToken: await getContractAddress(collateralToken),
        LoanToken: await getContractAddress(loanToken),
        LendingProtocol: await getContractAddress(lendingProtocol)
      }
    };
    fs.writeFileSync('deployment-info.json', JSON.stringify(deploymentInfo, null, 2));
    console.log("\nDeployment info saved to deployment-info.json");
  }
}

// Función auxiliar para manejar diferentes versiones de ethers
async function getContractAddress(contract) {
  try {
    return await contract.getAddress(); // ethers v6
  } catch (e) {
    return contract.address; // ethers v5
  }
}

// Funciones de conversión compatibles
function parseEther(amount) {
  try {
    return ethers.parseEther(amount); // ethers v6
  } catch (e) {
    return ethers.utils.parseEther(amount); // ethers v5
  }
}

function formatEther(amount) {
  try {
    return ethers.formatEther(amount); // ethers v6
  } catch (e) {
    return ethers.utils.formatEther(amount); // ethers v5
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
