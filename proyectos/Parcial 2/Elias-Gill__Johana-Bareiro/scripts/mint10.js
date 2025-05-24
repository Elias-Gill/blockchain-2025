const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  
  console.log("Minteando NFTs con la cuenta:", deployer.address);
  console.log("Balance inicial:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  const Marketplace = await ethers.getContractAt("Marketplace", contractAddress);
  
  // Verificar el contador actual
  const initialCounter = await Marketplace.tokenCounter();
  console.log(`NFTs existentes antes del minteo: ${initialCounter}`);

  // Mintear 10 NFTs
  for (let i = 0; i < 10; i++) {
    try {
      const uri = `ipfs://QmXYZ.../nft-${i}.json`; // URI de ejemplo (deberías usar una real)
      const price = ethers.parseEther("0.01"); // 0.01 ETH
      
      console.log(`Minteando NFT ${i}...`);
      const tx = await Marketplace.mintAndList(uri, price);
      await tx.wait();
      
      console.log(`✅ NFT ${i} minteado. TX: ${tx.hash}`);
      
      // Pequeña espera entre mints para evitar congestionar
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Error minteando NFT ${i}:`, error.message);
    }
  }

  // Verificar resultados finales
  const finalCounter = await Marketplace.tokenCounter();
  console.log(`Total NFTs después del minteo: ${finalCounter}`);
  console.log("Operación completada");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error general:", error);
    process.exit(1);
  });
