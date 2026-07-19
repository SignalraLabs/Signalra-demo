const { ethers } = require('ethers');

const RPC_URL = process.env.RPC_URL || 'https://ethereum-rpc.publicnode.com';

// Default contract: Tether USD (USDT) on Ethereum mainnet.
// Chosen because it exposes name/symbol/decimals/totalSupply and a public owner().
const DEFAULT_CONTRACT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

// Minimal human-readable ABI covering the public data we want to read.
const ERC20_READ_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function owner() view returns (address)',
];

/**
 * Reads a single view function and returns null instead of throwing when the
 * contract does not implement it (e.g. owner() is not part of the ERC-20
 * standard, and some older tokens skip name()/symbol()).
 */
async function readOptional(contract, method) {
  try {
    return await contract[method]();
  } catch (err) {
    return null;
  }
}

module.exports = {
  /**
   * GET /dhivakarApiTest
   *
   * Returns public on-chain data for an ERC-20 smart contract.
   * Optional query param `address` selects another contract; defaults to USDT.
   */
  async getContractInfo(req, res) {
    const address = req.query.address || DEFAULT_CONTRACT_ADDRESS;

    // Validate input before touching the network.
    if (!ethers.utils.isAddress(address)) {
      return res.status(400).json({
        error: true,
        message: `"${address}" is not a valid Ethereum address.`,
      });
    }

    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

    // Confirm RPC connectivity first so network problems produce a clear error.
    let network;
    try {
      network = await provider.getNetwork();
    } catch (err) {
      return res.status(503).json({
        error: true,
        message: 'Unable to reach the blockchain RPC endpoint. Please try again later.',
        detail: err.message,
      });
    }

    try {
      // A plain wallet address has no bytecode — reject it explicitly instead of
      // letting the ERC-20 calls fail with a confusing revert.
      const bytecode = await provider.getCode(address);
      if (bytecode === '0x') {
        return res.status(422).json({
          error: true,
          message: `No smart contract is deployed at ${address} on ${network.name}.`,
        });
      }

      const contract = new ethers.Contract(address, ERC20_READ_ABI, provider);

      const [name, symbol, decimals, totalSupply, owner] = await Promise.all([
        readOptional(contract, 'name'),
        readOptional(contract, 'symbol'),
        readOptional(contract, 'decimals'),
        readOptional(contract, 'totalSupply'),
        readOptional(contract, 'owner'),
      ]);

      // If none of the standard fields resolve, the contract is not ERC-20-like.
      if (name === null && symbol === null && totalSupply === null) {
        return res.status(422).json({
          error: true,
          message: `The contract at ${address} does not expose standard ERC-20 data.`,
        });
      }

      return res.status(200).json({
        error: false,
        data: {
          contractAddress: ethers.utils.getAddress(address),
          network: { name: network.name, chainId: network.chainId },
          tokenName: name,
          tokenSymbol: symbol,
          decimals: decimals,
          totalSupplyRaw: totalSupply ? totalSupply.toString() : null,
          totalSupplyFormatted:
            totalSupply !== null && decimals !== null
              ? ethers.utils.formatUnits(totalSupply, decimals)
              : null,
          // owner() is optional in ERC-20; null means the contract has no owner getter.
          contractOwner: owner,
        },
      });
    } catch (err) {
      return res.status(502).json({
        error: true,
        message: 'Failed to read data from the smart contract.',
        detail: err.message,
      });
    }
  },
};