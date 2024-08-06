// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {InterchainTokenStandard} from "@axelar-network/interchain-token-service/contracts/interchain-token/InterchainTokenStandard.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Minter} from "@axelar-network/interchain-token-service/contracts/utils/Minter.sol";

contract Token is ERC20, InterchainTokenStandard, Minter {
    uint8 internal immutable tokenDecimal;
    bytes32 internal tokenId;
    address internal immutable interchainTokenServiceAddress;

    uint256 public feePercent;
    uint256 internal constant UINT256_MAX = 2 ** 256 - 1;

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimalValue,
        uint256 _feePercent,
        address _interchainTokenService
    ) ERC20(_name, _symbol) {
        tokenDecimal = _decimalValue;
        interchainTokenServiceAddress = _interchainTokenService;
        feePercent = _feePercent;
        _addMinter(msg.sender);
    }

    // Mintable
    function mint(
        address account,
        uint256 amount
    ) external onlyRole(uint8(Roles.MINTER)) {
        _mint(account, amount);
    }

    // Burnable
    function burn(
        address account,
        uint256 amount
    ) external onlyRole(uint8(Roles.MINTER)) {
        _burn(account, amount);
    }

    // Add Minter
    function addMinter(address minter) external {
        _addMinter(minter);
    }

    function setFeePercent(
        uint256 _feePercent
    ) external onlyRole(uint8(Roles.MINTER)) {
        require(_feePercent <= 100, "Fee percent too high");
        feePercent = _feePercent;
    }

    // Transfer token from sender to the recipient
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        // Calculate the fee
        uint256 fee = (amount * feePercent) / 1e18; // feePercent
        uint256 amountAfterFeeDeduction = amount - fee;
        super.transferFrom(from, to, amountAfterFeeDeduction);

        /**
         * NOTE: Burning of the fee is just one of
         * many options here. For simplicity the fee is getting
         * burnt, but you can instead for example:
         * 1. Send to reward pool
         * 2. Send to treasury
         * 3. Send to liquidity pool
         * 4. Cross-chain Remittance Services
         * 5. Decentralized Exchange (DEX) Token
         * 6. Governance Token for Cross-Chain DAOs
         * 7. Reward Token for Multi-Chain DeFi Platforms
         * 8. Subscription Service Token
         */
        _burn(from, fee);
        return true;
    }

    // The _spendAllowance function is overridden to handle allowances correctly,
    // considering both ERC20 and InterchainTokenStandard requirements.
    function _spendAllowance(
        address sender,
        address spender,
        uint256 amount
    ) internal override(ERC20, InterchainTokenStandard) {
        uint256 _allowance = allowance(sender, spender);
        if (_allowance != UINT256_MAX) {
            _approve(sender, spender, _allowance - amount);
        }
    }

    // Other functions
    // Returns the interchain token service
    function interchainTokenService() public view override returns (address) {
        return interchainTokenServiceAddress;
    }

    // Returns the tokenId for this token.
    function interchainTokenId() public view override returns (bytes32) {
        return tokenId;
    }

    function decimals() public view override returns (uint8) {
        return tokenDecimal;
    }
}
