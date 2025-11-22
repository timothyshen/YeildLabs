/**
 * Pendle Position Fetcher
 * 
 * Combines Pendle API market data with on-chain token balances
 * to provide complete position information
 */

import { fetchMarkets } from './apiClient';
import { getTokenBalance, getTokenBalances } from './balances';
import type { PendlePosition } from '@/types';
import type { PendlePool } from '@/types';

/**
 * Get user's Pendle positions for a specific chain
 */
export async function getUserPendlePositions(
  userAddress: string,
  chainId: number = 8453
): Promise<PendlePosition[]> {
  console.log(`🔍 Fetching Pendle positions for ${userAddress} on chain ${chainId}`);

  // 1. Fetch all markets from API
  const markets = await fetchMarkets(chainId);
  
  if (!markets || markets.length === 0) {
    console.log('⚠️ No markets found');
    return [];
  }

  console.log(`📊 Found ${markets.length} markets, checking balances...`);

  // 2. Extract all token addresses we need to check
  const tokenAddresses = new Set<string>();
  const marketMap = new Map<string, any>();

  markets.forEach((market) => {
    if (market.address) {
      marketMap.set(market.address, market);
    }

    // Extract addresses from chainId-address format
    const extractAddress = (token: string) => {
      if (!token) return null;
      const parts = token.split('-');
      return parts.length > 1 ? parts[1] : token;
    };

    const ptAddress = extractAddress(market.pt);
    const ytAddress = extractAddress(market.yt);
    const syAddress = extractAddress(market.sy);
    const lpAddress = market.address; // LP token is the market address

    if (ptAddress) tokenAddresses.add(ptAddress.toLowerCase());
    if (ytAddress) tokenAddresses.add(ytAddress.toLowerCase());
    if (syAddress) tokenAddresses.add(syAddress.toLowerCase());
    if (lpAddress) tokenAddresses.add(lpAddress.toLowerCase());
  });

  // 3. Get all balances in parallel
  const balancePromises = Array.from(tokenAddresses).map((address) =>
    getTokenBalance(userAddress, address).then((balance) => ({
      address: address.toLowerCase(),
      balance,
    }))
  );

  const balances = await Promise.all(balancePromises);
  const balanceMap = new Map(
    balances.map((b) => [b.address, b.balance])
  );

  console.log(`✅ Checked ${tokenAddresses.size} token balances`);

  // 4. Build positions from markets with non-zero balances
  const positions: PendlePosition[] = [];

  for (const market of markets) {
    const extractAddress = (token: string) => {
      if (!token) return null;
      const parts = token.split('-');
      return parts.length > 1 ? parts[1] : token;
    };

    const ptAddress = extractAddress(market.pt)?.toLowerCase();
    const ytAddress = extractAddress(market.yt)?.toLowerCase();
    const syAddress = extractAddress(market.sy)?.toLowerCase();
    const lpAddress = market.address?.toLowerCase();

    const ptBalance = ptAddress ? balanceMap.get(ptAddress) : null;
    const ytBalance = ytAddress ? balanceMap.get(ytAddress) : null;
    const syBalance = syAddress ? balanceMap.get(syAddress) : null;
    const lpBalance = lpAddress ? balanceMap.get(lpAddress) : null;

    // Check if user has any position in this market
    const hasPosition =
      (ptBalance && ptBalance.formatted > 0) ||
      (ytBalance && ytBalance.formatted > 0) ||
      (syBalance && syBalance.formatted > 0) ||
      (lpBalance && lpBalance.formatted > 0);

    if (!hasPosition) {
      continue; // Skip markets with no position
    }

    // Build position object
    const position = await buildPosition(
      market,
      {
        pt: ptBalance,
        yt: ytBalance,
        sy: syBalance,
        lp: lpBalance,
      },
      chainId
    );

    if (position) {
      positions.push(position);
    }
  }

  console.log(`✅ Found ${positions.length} active positions`);
  return positions;
}

/**
 * Build a PendlePosition from market data and balances
 */
async function buildPosition(
  market: any,
  balances: {
    pt: { raw: bigint; formatted: number; decimals: number } | null;
    yt: { raw: bigint; formatted: number; decimals: number } | null;
    sy: { raw: bigint; formatted: number; decimals: number } | null;
    lp: { raw: bigint; formatted: number; decimals: number } | null;
  },
  chainId: number
): Promise<PendlePosition | null> {
  try {
    // Parse expiry date
    const expiryDate = market.expiry ? new Date(market.expiry) : null;
    const maturity = expiryDate ? Math.floor(expiryDate.getTime() / 1000) : 0;
    const now = Date.now() / 1000;
    const daysToMaturity = maturity > now ? Math.ceil((maturity - now) / 86400) : 0;

    // Extract underlying asset symbol
    let underlyingAsset = 'UNKNOWN';
    if (market.name) {
      const nameParts = market.name.split('-');
      if (nameParts.length > 1 && nameParts[0] === 'PT') {
        underlyingAsset = nameParts[1];
      } else {
        underlyingAsset = nameParts[0];
      }
    }

    // Build pool object (simplified, can be enhanced with full pool data)
    // Using legacy PendlePool type which has underlyingAsset as string
    const pool: PendlePool = {
      address: market.address,
      name: market.name || `PT-${underlyingAsset}`,
      symbol: market.name || `PT-${underlyingAsset}`,
      underlyingAsset: underlyingAsset, // Legacy type uses string
      maturity,
      tvl: 0, // Will be populated if we fetch pool details
      apy: 0, // Will be populated if we fetch pool details
      impliedYield: 0,
      ptPrice: 0.95, // Default, should be fetched from API
      ytPrice: 0.05, // Default, should be fetched from API
      ptDiscount: 0.05,
      daysToMaturity,
      strategyTag: 'Neutral',
    };

    // Calculate position values
    // Note: This is simplified. In production, you'd fetch current prices from API
    const ptValue = balances.pt?.formatted || 0;
    const ytValue = balances.yt?.formatted || 0;
    const syValue = balances.sy?.formatted || 0;
    const lpValue = balances.lp?.formatted || 0;

    // For now, use simplified value calculation
    // In production, fetch actual token prices from API
    const currentValue = ptValue + ytValue + syValue + lpValue;
    const costBasis = currentValue * 0.95; // Placeholder - would need transaction history
    const unrealizedPnL = currentValue - costBasis;
    const realizedPnL = 0; // Would need transaction history
    const totalPnL = unrealizedPnL + realizedPnL;
    const pnlPercent = costBasis > 0 ? (totalPnL / costBasis) * 100 : 0;

    // Calculate maturity value (PT will be worth 1 at maturity)
    const maturityValue = ptValue * 1.0 + ytValue * 0 + syValue * 1.0 + lpValue * 1.0;

    const position: PendlePosition = {
      poolAddress: market.address,
      pool,
      ptBalance: balances.pt?.raw.toString() || '0',
      ptBalanceFormatted: balances.pt?.formatted || 0,
      ytBalance: balances.yt?.raw.toString() || '0',
      ytBalanceFormatted: balances.yt?.formatted || 0,
      syBalance: balances.sy?.raw.toString() || '0',
      syBalanceFormatted: balances.sy?.formatted || 0,
      lpBalance: balances.lp?.raw.toString() || '0',
      lpBalanceFormatted: balances.lp?.formatted || 0,
      costBasis,
      currentValue,
      maturityValue,
      realizedPnL,
      unrealizedPnL,
      totalPnL,
      pnlPercent,
      currentAPY: pool.apy,
      projectedYield: pool.impliedYield,
      autoRollEnabled: false,
      autoRollDaysBeforeMaturity: 7,
      firstAcquired: now, // Placeholder
      lastUpdated: now,
    };

    return position;
  } catch (error) {
    console.error(`Error building position for market ${market.address}:`, error);
    return null;
  }
}

