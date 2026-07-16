const { ethers } = require('ethers');

// Public Ethereum mainnet RPC endpoint (override via ETH_RPC_URL env variable)
const RPC_URL = process.env.ETH_RPC_URL || 'https://ethereum-rpc.publicnode.com';

// Default contract: Tether USD (USDT) on Ethereum mainnet. Override this
// together with ETH_RPC_URL when pointing the app at a different network.
const DEFAULT_CONTRACT_ADDRESS =
  process.env.DEFAULT_CONTRACT_ADDRESS ||
  '0xdAC17F958D2ee523a2206206994597C13D831ec7';

// Shared provider instance. StaticJsonRpcProvider caches network detection
// (a plain JsonRpcProvider re-issues eth_chainId on every getNetwork call);
// the timeout keeps a hung RPC from holding requests open.
const provider = new ethers.providers.StaticJsonRpcProvider({
  url: RPC_URL,
  timeout: 10000,
});

// Minimal read-only ABI covering the public data we want to expose
const ERC20_READ_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function owner() view returns (address)',
];

module.exports = {
  /**
   * GET /api/iliyanApiTest
   *
   * Retrieves publicly accessible data from an ERC-20 smart contract.
   * Accepts an optional `address` query parameter; defaults to USDT.
   *
   * Response shape follows the project convention:
   *   { error: false, data: {...} } on success
   *   { error: true,  message: "..." } on failure
   */
  async getContractInfo(req, res) {
    const address = req.query.address || DEFAULT_CONTRACT_ADDRESS;

    // Validate the address before hitting the network
    if (!ethers.utils.isAddress(address)) {
      return res.status(400).json({
        error: true,
        message: `Invalid contract address: ${address}`,
      });
    }

    try {
      // Ensure the address actually holds contract code
      const code = await provider.getCode(address);
      if (code === '0x') {
        return res.status(400).json({
          error: true,
          message: `No smart contract deployed at ${address}`,
        });
      }

      const contract = new ethers.Contract(address, ERC20_READ_ABI, provider);

      // All reads are independent, so run them as one parallel batch.
      // owner() is not part of the ERC-20 standard and is optional;
      // getNetwork() reports the chain the provider is actually on.
      const [name, symbol, decimals, totalSupply, owner, network] =
        await Promise.all([
          contract.name(),
          contract.symbol(),
          contract.decimals(),
          contract.totalSupply(),
          contract.owner().catch(() => null),
          provider.getNetwork(),
        ]);

      // ethers names mainnet "homestead", so map it to a friendlier label
      const networkLabel =
        network.chainId === 1
          ? 'Ethereum Mainnet'
          : `${network.name} (chainId ${network.chainId})`;

      return res.status(200).json({
        error: false,
        data: {
          contractAddress: address,
          network: networkLabel,
          name,
          symbol,
          decimals,
          totalSupplyRaw: totalSupply.toString(),
          totalSupplyFormatted: ethers.utils.formatUnits(totalSupply, decimals),
          owner,
          fetchedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      // A deployed contract whose ERC-20 getters revert or don't exist
      // (e.g. a multisig) is a client-input problem, not an upstream failure
      if (err.code === 'CALL_EXCEPTION') {
        return res.status(422).json({
          error: true,
          message: `Contract at ${address} does not implement the ERC-20 interface`,
        });
      }

      // Distinguish network/connectivity problems from bad contract
      // responses; ethers nests transport failures under `serverError`
      // on some code paths, so check for that shape as well
      const isNetworkIssue =
        err.code === 'NETWORK_ERROR' ||
        err.code === 'SERVER_ERROR' ||
        err.code === 'TIMEOUT' ||
        Boolean(err.serverError);

      const status = isNetworkIssue ? 503 : 502;
      const message = isNetworkIssue
        ? 'Unable to reach the blockchain network. Please try again later.'
        : 'The contract returned an invalid or unexpected response.';

      // Full error stays server-side only — provider messages can embed
      // the RPC URL (and any API key inside it), so never echo them back
      console.error('[iliyanApiTest] contract fetch failed:', err.message);

      return res.status(status).json({
        error: true,
        message,
      });
    }
  },
};
