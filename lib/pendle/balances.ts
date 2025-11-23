/**
 * On-Chain Balance Fetcher
 * 
 * Uses viem to fetch token balances on-chain
 * Required because Pendle API doesn't provide user position data directly
 */

import { createPublicClient, http, type Address } from 'viem';
import { base } from 'viem/chains';

// ERC20 ABI for balanceOf
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
] as const;

// Create public client for Base chain
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

/**
 * Get ERC20 token balance for an address
 */
export async function getTokenBalance(
  userAddress: string,
  tokenAddress: string
): Promise<{ raw: bigint; formatted: number; decimals: number }> {
  try {
    const [balance, decimals] = await Promise.all([
      publicClient.readContract({
        address: tokenAddress as Address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [userAddress as Address],
      }),
      publicClient.readContract({
        address: tokenAddress as Address,
        abi: ERC20_ABI,
        functionName: 'decimals',
      }).catch(() => 18), // Default to 18 if decimals call fails
    ]);

    const formatted = Number(balance) / Math.pow(10, Number(decimals));

    return {
      raw: balance as bigint,
      formatted,
      decimals: Number(decimals),
    };
  } catch (error) {
    console.error(`Error fetching balance for ${tokenAddress}:`, error);
    return {
      raw: BigInt(0),
      formatted: 0,
      decimals: 18,
    };
  }
}

/**
 * Get multiple token balances in parallel
 */
export async function getTokenBalances(
  userAddress: string,
  tokenAddresses: string[]
): Promise<Map<string, { raw: bigint; formatted: number; decimals: number }>> {
  const balances = new Map();

  // Fetch all balances in parallel
  const results = await Promise.all(
    tokenAddresses.map(async (tokenAddress) => {
      const balance = await getTokenBalance(userAddress, tokenAddress);
      return { tokenAddress, balance };
    })
  );

  results.forEach(({ tokenAddress, balance }) => {
    balances.set(tokenAddress.toLowerCase(), balance);
  });

  return balances;
}

/**
 * Check if address has any balance (non-zero)
 */
export async function hasBalance(
  userAddress: string,
  tokenAddress: string
): Promise<boolean> {
  const balance = await getTokenBalance(userAddress, tokenAddress);
  return balance.raw > BigInt(0);
}

