/**
 * Pendle Position Fetcher
 * 
 * Uses Pendle API /v1/dashboard/positions/database/{address} endpoint
 * to fetch user positions directly from Pendle's database
 */

import { fetchUserPositions, fetchMarkets } from './apiClient';
import type { PendlePosition, PendlePool } from '@/types/unified';

/**
 * Get user's Pendle positions for a specific chain
 * Uses Pendle's positions database API endpoint
 */
export async function getUserPendlePositions(
  userAddress: string,
  chainId: number = 8453
): Promise<PendlePosition[]> {
  console.log(`🔍 Fetching Pendle positions for ${userAddress} on chain ${chainId}`);

  // 1. Fetch positions from Pendle database API
  let positionsData;
  try {
    positionsData = await fetchUserPositions(userAddress, { filterUsd: 0.1 });
  } catch (error) {
    console.error('❌ Error fetching positions from Pendle API:', error);
    return [];
  }
  
  if (!positionsData || positionsData.length === 0) {
    console.log('⚠️ No positions found in database');
    return [];
  }

  // 2. Filter for the requested chainId
  const chainData = positionsData.find((data: any) => data.chainId === chainId);
  
  if (!chainData) {
    const availableChains = positionsData.map((d: any) => d.chainId).join(', ');
    console.log(`⚠️ No positions found for chain ${chainId}. Available chains: ${availableChains || 'none'}`);
    return [];
  }

  console.log(`📊 Found ${chainData.totalOpen || 0} open positions, ${chainData.totalClosed || 0} closed positions for chain ${chainId}`);

  // 3. Fetch markets to get pool details
  const markets = await fetchMarkets(chainId);
  const marketMap = new Map<string, any>();
  markets.forEach((market) => {
    marketMap.set(market.address.toLowerCase(), market);
  });

  // 4. Transform open positions
  const positions: PendlePosition[] = [];
  
  const openPositions = chainData.openPositions || [];
  for (const pos of openPositions) {
    const position = await transformPosition(pos, chainId, marketMap, false, chainData);
    if (position) {
      positions.push(position);
    }
  }

  // 5. Optionally include closed positions (for historical tracking)
  // For now, we'll only return open positions
  // const closedPositions = chainData.closedPositions || [];
  // for (const pos of closedPositions) {
  //   const position = await transformPosition(pos, chainId, marketMap, true);
  //   if (position) {
  //     positions.push(position);
  //   }
  // }

  console.log(`✅ Transformed ${positions.length} positions`);
  return positions;
}

/**
 * Transform Pendle API position data to our PendlePosition format
 * 
 * Position structure from API:
 * {
 *   marketId: "8453-0x...", // chainId-address format
 *   pt: { valuation: number, balance: string },
 *   yt: { valuation: number, balance: string },
 *   lp: { valuation: number, balance: string, activeBalance: string }
 * }
 */
async function transformPosition(
  pos: any,
  chainId: number,
  marketMap: Map<string, any>,
  isClosed: boolean,
  chainData: any
): Promise<PendlePosition | null> {
  try {
    // Extract market address from marketId (format: "chainId-address")
    const marketId = pos.marketId || '';
    const marketAddress = marketId.split('-').pop()?.toLowerCase() || '';
    
    if (!marketAddress) {
      console.warn('⚠️ Invalid marketId format:', marketId);
      return null;
    }

    // Get market data
    const market = marketMap.get(marketAddress);
    if (!market) {
      console.warn(`⚠️ Market not found for address ${marketAddress}`);
      // Continue with limited data if market not found
    }

    // Parse expiry date from market
    const expiryDate = market?.expiry ? new Date(market.expiry) : null;
    const maturity = expiryDate ? Math.floor(expiryDate.getTime() / 1000) : 0;
    const now = Date.now() / 1000;
    const daysToMaturity = maturity > now ? Math.ceil((maturity - now) / 86400) : 0;

    // Extract underlying asset symbol
    let underlyingAsset = 'UNKNOWN';
    if (market?.name) {
      const nameParts = market.name.split('-');
      if (nameParts.length > 1 && nameParts[0] === 'PT') {
        underlyingAsset = nameParts[1];
      } else {
        underlyingAsset = nameParts[0];
      }
    }

    // Parse balances (API returns as strings, may be negative for closed positions)
    const ptBalanceRaw = pos.pt?.balance || '0';
    const ytBalanceRaw = pos.yt?.balance || '0';
    const lpBalanceRaw = pos.lp?.balance || '0';
    const lpActiveBalanceRaw = pos.lp?.activeBalance || '0';

    // Convert to numbers (handle negative balances for closed positions)
    const ptBalance = BigInt(ptBalanceRaw);
    const ytBalance = BigInt(ytBalanceRaw);
    const lpBalance = BigInt(lpBalanceRaw);
    const lpActiveBalance = BigInt(lpActiveBalanceRaw);

    // Use absolute values for formatted amounts
    const ptBalanceFormatted = Number(ptBalance) / 1e18; // Assuming 18 decimals
    const ytBalanceFormatted = Number(ytBalance) / 1e18;
    const lpBalanceFormatted = Number(lpBalance) / 1e18;
    const lpActiveBalanceFormatted = Number(lpActiveBalance) / 1e18;

    // Get valuations from API (already in USD)
    const ptValuation = Math.abs(pos.pt?.valuation || 0);
    const ytValuation = Math.abs(pos.yt?.valuation || 0);
    const lpValuation = Math.abs(pos.lp?.valuation || 0);

    // Calculate current value
    const currentValue = ptValuation + ytValuation + lpValuation;

    // Extract token addresses from market
    const extractTokenAddress = (tokenStr: string) => {
      if (!tokenStr) return '0x';
      const parts = tokenStr.split('-');
      return parts.length > 1 ? parts[1] : tokenStr;
    };

    const ptAddress = market?.pt ? extractTokenAddress(market.pt) : '0x';
    const ytAddress = market?.yt ? extractTokenAddress(market.yt) : '0x';
    const syAddress = market?.sy ? extractTokenAddress(market.sy) : '0x';

    // Build pool object with all required fields
    const pool: PendlePool = {
      address: marketAddress,
      name: market?.name || `PT-${underlyingAsset}`,
      symbol: market?.name || `PT-${underlyingAsset}`,
      underlyingAsset: {
        address: market?.underlyingAsset ? extractTokenAddress(market.underlyingAsset) : '0x',
        symbol: underlyingAsset,
        name: underlyingAsset,
        decimals: 18,
        chainId: chainId,
        priceUSD: 1,
      },
      syToken: {
        address: syAddress,
        symbol: `SY-${underlyingAsset}`,
        name: `SY-${underlyingAsset}`,
        decimals: 18,
        chainId: chainId,
        priceUSD: 1,
      },
      ptToken: {
        address: ptAddress,
        symbol: `PT-${underlyingAsset}`,
        name: `PT-${underlyingAsset}`,
        decimals: 18,
        chainId: chainId,
        priceUSD: market?.details?.ptPrice || 0.95,
      },
      ytToken: {
        address: ytAddress,
        symbol: `YT-${underlyingAsset}`,
        name: `YT-${underlyingAsset}`,
        decimals: 18,
        chainId: chainId,
        priceUSD: market?.details?.ytPrice || 0.05,
      },
      maturity,
      maturityDate: expiryDate?.toISOString() || '',
      daysToMaturity,
      isExpired: maturity < Date.now() / 1000,
      tvl: market?.details?.liquidity || 0,
      apy: (market?.details?.aggregatedApy || 0) * 100, // Convert to percentage
      impliedYield: (market?.details?.impliedApy || 0) * 100,
      ptPrice: market?.details?.ptPrice || 0.95,
      ytPrice: market?.details?.ytPrice || 0.05,
      ptDiscount: market?.details?.ptDiscount || 0.05,
      syPrice: 1,
      strategyTag: 'Neutral',
      riskLevel: 'neutral',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Calculate PnL (simplified - API provides valuations)
    // For closed positions, valuations are typically negative
    const costBasis = currentValue * 0.95; // Placeholder
    const unrealizedPnL = isClosed ? 0 : (currentValue - costBasis);
    const realizedPnL = isClosed ? (currentValue - costBasis) : 0;
    const totalPnL = unrealizedPnL + realizedPnL;
    const pnlPercent = costBasis > 0 ? (totalPnL / costBasis) * 100 : 0;

    // Calculate maturity value
    const maturityValue = ptBalanceFormatted * 1.0 + lpBalanceFormatted * 1.0;

    const position: PendlePosition = {
      poolAddress: marketAddress,
      pool,
      ptBalance: ptBalance.toString(),
      ptBalanceFormatted: Math.abs(ptBalanceFormatted),
      ytBalance: ytBalance.toString(),
      ytBalanceFormatted: Math.abs(ytBalanceFormatted),
      syBalance: '0', // SY positions are separate in API
      syBalanceFormatted: 0,
      lpBalance: lpBalance.toString(),
      lpBalanceFormatted: Math.abs(lpBalanceFormatted),
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
      lastUpdated: chainData?.updatedAt ? new Date(chainData.updatedAt).getTime() / 1000 : now,
    };

    return position;
  } catch (error) {
    console.error(`Error transforming position:`, error);
    return null;
  }
}

