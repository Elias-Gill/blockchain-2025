const { ethers } = require("hardhat");
require("dotenv").config();

// URLs de IPFS para los 10 NFTs (ejemplo - reemplazar con tus URIs reales)
const IPFS_URIS = [
  "ipfs://QmX1.../1.json",
  "ipfs://QmX2.../2.json",
  "ipfs://QmX3.../3.json",
  "ipfs://QmX4.../4.json",
  "ipfs://QmX5.../5.json",
  "ipfs://QmX6.../6.json",
  "ipfs://QmX7.../7.json",
  "ipfs://QmX8.../8.json",
  "ipfs://QmX9.../9.json",
  "ipfs://QmX10.../10.json"
];

const INITIAL_PRICES = Array(10).fill(ethers.parseEther("0.01")); // 0.01 ETH cada uno

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Desplegando contrato con la cuenta:", deployer.address);
  console.log("Balance inicial:", (await deployer.provider.getBalance(deployer.address)).toString());

  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy();
  
  await marketplace.waitForDeployment();
  const contractAddress = await marketplace.getAddress();

  console.log("\n=== Despliegue completado ===");
  console.log("Marketplace desplegado en:", contractAddress);
  console.log("Contador de NFTs inicial:", (await marketplace.tokenCounter()).toString());

  // Mint y listado de 10 NFTs iniciales
  console.log("\nCreando 10 NFTs iniciales...");
  for (let i = 0; i < 10; i++) {
    const tx = await marketplace.mintAndList(IPFS_URIS[i], INITIAL_PRICES[i]);
    await tx.wait();
    console.log(`NFT ${i+1} creado - TX: ${tx.hash}`);
  }

  console.log("\n=== Resumen final ===");
  console.log("Total NFTs creados:", (await marketplace.tokenCounter()).toString());
  console.log("Balance final deployer:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Guía para el usuario
  console.log("\n⚠️ IMPORTANTE:");
  console.log(`1. Configura tu frontend con esta dirección: ${contractAddress}`);
  console.log("2. Asegúrate de tener los metadatos en:", IPFS_URIS[0].replace("1.json", ""));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error durante el despliegue:", error);
    process.exit(1);
  });
