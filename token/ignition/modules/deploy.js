const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("DeployModule", (m) => {
  // Deploy Token contract
  const Token = m.contract("Token", [
    "MyToken",
    "MTK",
    18,
    "50000000000000000", // 0.05 ETH
    "0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C",
  ]);

  return {
    Token,
  };
});

// Avalanche: 0x255bDEBE3E43F3A20A164b25b257Fe2f8b259f91
// Fantom: 0x76223E78d80807FB1BDA0086bce605497B442d64