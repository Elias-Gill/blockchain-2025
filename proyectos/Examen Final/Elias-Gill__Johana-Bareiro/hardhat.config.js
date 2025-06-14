require("@nomicfoundation/hardhat-toolbox");

require("dotenv").config(); // <== Agregá esta línea arriba de todo

module.exports = {
  solidity: "0.8.20",
  networks: {
    ephemery: {
      url: process.env.VITE_EPHEMERY_TESTNET,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};
