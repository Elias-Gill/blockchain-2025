require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("solidity-coverage");

module.exports = {
  solidity: "0.8.20",
  networks: {
    ephemery: {
      url: process.env.VITE_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  hardhat: {
    // Configuración para coverage
    initialBaseFeePerGas: 0,
  },
  mocha: {
    timeout: 40000,
  },
};
