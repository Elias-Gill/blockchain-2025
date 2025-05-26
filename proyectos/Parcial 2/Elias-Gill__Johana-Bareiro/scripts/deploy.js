require("dotenv").config();

async function main() {
  // Deployment Setup
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deployment Engine
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const market = await Marketplace.deploy();

  // Verificacion post-Deployment
  console.log("Contract address:", await market.getAddress());
  const deploymentReceipt = await market.deploymentTransaction().wait();
  console.log("Deployed in block:", deploymentReceipt.blockNumber);

  // Iniciar coleccion NFT
  const baseURI = `ipfs://${process.env.IPFS_CODE}/`;
  for (let i = 0; i < 10; i++) {
    const tx = await market.mintAndList(
      `${baseURI}${i}.json`,
      ethers.parseEther("0.01")
    );
    await tx.wait();
    console.log(`Minted NFT ${i + 1}/10`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
