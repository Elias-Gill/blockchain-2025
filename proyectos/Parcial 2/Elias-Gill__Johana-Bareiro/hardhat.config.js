require("@nomicfoundation/hardhat-toolbox");

require("dotenv").config(); // <== Agregá esta línea arriba de todo

module.exports = {
  solidity: "0.8.20",
  networks: {
    ephemery: {
      url: "https://otter.bordel.wtf/erigon",
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};
