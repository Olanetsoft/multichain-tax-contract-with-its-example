const hre = require("hardhat");
const crypto = require("crypto");
const {
  AxelarQueryAPI,
  Environment,
  EvmChain,
  GasToken,
} = require("@axelar-network/axelarjs-sdk");
const api = new AxelarQueryAPI({ environment: Environment.TESTNET });

const interchainTokenServiceContractABI = require("./utils/interchainTokenServiceABI");
const interchainTokenContractABI = require("./utils/interchainTokenABI");

const interchainTokenServiceContractAddress =
  "0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C";

const avalancheTokenAddress = "0x255bDEBE3E43F3A20A164b25b257Fe2f8b259f91";
const fantomTokenAddress = "0x76223E78d80807FB1BDA0086bce605497B442d64";

const LOCK_UNLOCK_FEE = 3;
const MINT_BURN = 4;

async function getContractInstance(contractAddress, contractABI, signer) {
  return new ethers.Contract(contractAddress, contractABI, signer);
}

async function getSigner() {
  const [signer] = await ethers.getSigners();
  return signer;
}

// deploy Token Manager : Avalanche
async function deployTokenManagerAndAddAMinter() {
  // Get a signer to sign the transaction
  const signer = await getSigner();

  // Get the InterchainTokenService contract instance
  const interchainTokenServiceContract = await getContractInstance(
    interchainTokenServiceContractAddress,
    interchainTokenServiceContractABI,
    signer
  );

  const interchainTokenContract = await getContractInstance(
    avalancheTokenAddress,
    interchainTokenContractABI,
    signer
  );

  // Generate a random salt
  const salt = "0x" + crypto.randomBytes(32).toString("hex");

  // Create the params
  const params = ethers.utils.defaultAbiCoder.encode(
    ["bytes", "address"],
    [signer.address, avalancheTokenAddress]
  );

  // Deploy the token manager
  const deployTxData = await interchainTokenServiceContract.deployTokenManager(
    salt,
    "",
    LOCK_UNLOCK_FEE,
    params,
    ethers.utils.parseEther("0.01")
  );

  // Get the tokenId
  const tokenId = await interchainTokenServiceContract.interchainTokenId(
    signer.address,
    salt
  );

  // Get the token manager address
  const expectedTokenManagerAddress =
    await interchainTokenServiceContract.tokenManagerAddress(tokenId);

  // Add token manager as a minter
  await interchainTokenContract.addMinter(expectedTokenManagerAddress);

  console.log(
    ` 
      Salt: ${salt},
      Transaction Hash: ${deployTxData.hash},
      Token ID: ${tokenId}, 
      Expected Token Manager Address: ${expectedTokenManagerAddress},
    `
  );

  //     Salt: 0x8bfe80fc2d5d11189f70516a0630de94ebd059fbeeb704f8b2a4d7be006f5733,
  //     Transaction Hash: 0xd29816f74ee4429afb24de81b65a0e805b2c350a2f5aaac342395b54a6161b46,
  //     Token ID: 0x07256ce1daceb2ddcbc08981a93222637c6612f190c487362d161ad0a0a4df35,
  //     Expected Token Manager Address: 0x3Ee3737C61788bb7d8D630611175EEC1F02F29c0,
}

// Mint and approve ITS
async function mintAndApproveITS() {
  // Get a signer to sign the transaction
  const signer = await getSigner();

  // Get the InterchainToken contract instance
  const interchainTokenContract = await getContractInstance(
    avalancheTokenAddress,
    interchainTokenContractABI,
    signer
  );

  // Mint tokens
  await interchainTokenContract.mint(
    signer.address,
    ethers.utils.parseEther("1000")
  );

  // Approve ITS
  await interchainTokenContract.approve(
    interchainTokenServiceContractAddress, // ITS address
    ethers.utils.parseEther("1000")
  );

  console.log("Minting and Approving ITS successful!");
}

// Estimate gas costs.
async function gasEstimator() {
  const gas = await api.estimateGasFee(
    EvmChain.AVALANCHE,
    EvmChain.FANTOM,
    GasToken.ETH,
    700000,
    1.1
  );

  return gas;
}

// deploy Token Manager : Fantom
async function deployTokenManagerRemotely() {
  // Get a signer to sign the transaction
  const signer = await getSigner();

  // Get the InterchainTokenService contract instance
  const interchainTokenServiceContract = await getContractInstance(
    interchainTokenServiceContractAddress,
    interchainTokenServiceContractABI,
    signer
  );

  const interchainTokenContract = await getContractInstance(
    fantomTokenAddress,
    interchainTokenContractABI,
    signer
  );

  // Create the params
  const params = ethers.utils.defaultAbiCoder.encode(
    ["bytes", "address"],
    [signer.address, fantomTokenAddress]
  );

  const gasAmount = await gasEstimator();

  // Deploy the token manager remotely
  const deployTxData = await interchainTokenServiceContract.deployTokenManager(
    "0x8bfe80fc2d5d11189f70516a0630de94ebd059fbeeb704f8b2a4d7be006f5733", // salt
    "Fantom",
    MINT_BURN,
    params,
    ethers.utils.parseEther("0.01"),
    { value: gasAmount }
  );

  // Get the tokenId
  const tokenId = await interchainTokenServiceContract.interchainTokenId(
    signer.address,
    "0x8bfe80fc2d5d11189f70516a0630de94ebd059fbeeb704f8b2a4d7be006f5733" // salt
  );

  // Get the token manager address
  const expectedTokenManagerAddress =
    await interchainTokenServiceContract.tokenManagerAddress(tokenId);

  // Add token manager as a minter
  await interchainTokenContract.addMinter(expectedTokenManagerAddress);

  console.log(
    ` 
      Transaction Hash: ${deployTxData.hash},
      Token ID: ${tokenId}, 
      Expected Token Manager Address: ${expectedTokenManagerAddress},
    `
  );
}

// Transfer tokens : Avalanche -> Fantom
async function transferTokens() {
  // Get a signer to sign the transaction
  const signer = await getSigner();

  const interchainTokenServiceContract = await getContractInstance(
    interchainTokenServiceContractAddress,
    interchainTokenServiceContractABI,
    signer
  );
  const gasAmount = await gasEstimator();

  const transfer = await interchainTokenServiceContract.interchainTransfer(
    "0x07256ce1daceb2ddcbc08981a93222637c6612f190c487362d161ad0a0a4df35", // tokenId, the one you store in the earlier step
    "Fantom",
    "0x510e5EA32386B7C48C4DEEAC80e86859b5e2416C", // receiver address
    ethers.utils.parseEther("500"), // amount of token to transfer
    "0x", // data
    ethers.utils.parseEther("0.01"), // fee
    {
      // Transaction options should be passed here as an object
      value: gasAmount,
    }
  );

  console.log("Transfer Transaction Hash:", transfer.hash);
}

async function main() {
  const functionName = process.env.FUNCTION_NAME;
  switch (functionName) {
    case "deployTokenManagerAndAddAMinter":
      await deployTokenManagerAndAddAMinter();
      break;
    case "mintAndApproveITS":
      await mintAndApproveITS();
      break;
    case "deployTokenManagerRemotely":
      await deployTokenManagerRemotely();
      break;
    case "transferTokens":
      await transferTokens();
      break;
    default:
      console.error(`Unknown function: ${functionName}`);
      process.exitCode = 1;
      return;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// FUNCTION_NAME=deployTokenManagerAndAddAMinter npx hardhat run index.js --network avalanche
// FUNCTION_NAME=mintAndApproveITS npx hardhat run index.js --network avalanche
// FUNCTION_NAME=deployTokenManagerRemotely npx hardhat run index.js --network avalanche
// FUNCTION_NAME=transferTokens npx hardhat run index.js --network avalanche
