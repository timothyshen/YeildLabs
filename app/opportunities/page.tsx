'use client';

import React, { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { EnhancedStrategyCard } from '@/components/strategy/EnhancedStrategyCard';
import { StatCard } from '@/components/ui/StatCard';
import { Accordion, AccordionItem } from '@/components/ui/accordion';
import { PoolCard } from '@/components/scanner/PoolCard';
import { usePendlePools } from '@/lib/hooks/usePendlePools';
import { Zap, TrendingUp, SlidersHorizontal } from 'lucide-react';
import tokenAddresses from '@/lib/constants/token_address.json';
import type { PendlePool } from '@/types';

// USD Stablecoin symbols - filter from token_address.json (exclude sKAITO)
const USD_STABLECOINS = tokenAddresses
  .filter((token) => token.symbol !== 'sKAITO')
  .map((token) => token.symbol);

interface PurchasedPosition {
  id: string;
  assetSymbol: string;
  poolAddress: string;
  poolName: string;
  strategy: 'PT' | 'YT' | 'SPLIT';
  ptAllocation: number;
  ytAllocation: number;
  purchaseAmount: number;
  purchaseDate: number;
  expectedAPY: number;
  currentValue: number;
}

export default function OpportunitiesPage() {
  const { address: connectedAddress, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'scanner' | 'recommendations'>('recommendations');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchasedPositions, setPurchasedPositions] = useState<PurchasedPosition[]>([]);
  const [ratioAdjustments, setRatioAdjustments] = useState<Record<string, { pt: number; yt: number }>>({});

  // Filter states for recommendations
  const [showFilters, setShowFilters] = useState(false);
  const [minAPY, setMinAPY] = useState<number>(0);
  const [maxAPY, setMaxAPY] = useState<number>(100);
  const [maxMaturityDays, setMaxMaturityDays] = useState<number>(365);
  const [selectedRiskLevels, setSelectedRiskLevels] = useState<string[]>(['conservative', 'moderate', 'aggressive']);

  // Scanner states
  const { pools, isLoading: poolsLoading, error: poolsError, refreshPools } = usePendlePools(activeTab === 'scanner');
  const [sortBy, setSortBy] = useState<'apy-high' | 'apy-low' | 'tvl-high' | 'tvl-low' | 'maturity-soon' | 'maturity-far'>('apy-high');
  const [filterTag, setFilterTag] = useState<'all' | 'Best PT' | 'Best YT' | 'Risky' | 'Neutral'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPool, setSelectedPool] = useState<PendlePool | null>(null);

  const loadRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const walletAddress = connectedAddress;
      let userAssets: any[] = [];
      let usingRealAssets = false;

      // Try to fetch real assets from Octav wallet endpoint
      if (walletAddress) {
        try {
          const octavUrl = `/api/octav/wallet?addresses=${walletAddress}`;
          const octavResponse = await fetch(octavUrl);

          if (octavResponse.ok) {
            const octavResponseData = await octavResponse.json();

            if (octavResponseData.success) {
              const octavData = octavResponseData.data;
              const walletData = Array.isArray(octavData) ? octavData[0] : octavData;

              if (walletData) {
                const baseChainData = walletData.chains?.base || walletData.chains?.['8453'];

                if (baseChainData) {
                  const baseAssets: any[] = [];

                  if (baseChainData.protocolPositions?.WALLET) {
                    const walletProtocol = baseChainData.protocolPositions.WALLET;

                    if (walletProtocol.assets && Array.isArray(walletProtocol.assets)) {
                      walletProtocol.assets.forEach((asset: any) => {
                        baseAssets.push(asset);
                      });
                    }
                  }

                  const { getTokenInfoBySymbol } = await import('@/lib/utils/tokenAddress');

                  userAssets = baseAssets.map((asset: any) => {
                    const assetSymbol = asset.symbol || 'UNKNOWN';
                    const tokenInfo = getTokenInfoBySymbol(assetSymbol, 8453);

                    let tokenAddress = tokenInfo?.address || asset.address || asset.contractAddress || asset.token || '';
                    if (tokenAddress.includes('-')) {
                      tokenAddress = tokenAddress.split('-').pop() || tokenAddress;
                    }

                    return {
                      token: {
                        address: tokenAddress,
                        symbol: tokenInfo?.symbol || assetSymbol,
                        name: tokenInfo?.name || asset.name || assetSymbol,
                        decimals: tokenInfo?.decimals || asset.decimals || 18,
                        chainId: 8453,
                        priceUSD: tokenInfo?.priceUSD || asset.priceUSD || parseFloat(asset.value || asset.valueUSD || '0') / parseFloat(asset.balance || '1') || 0,
                      },
                      balance: asset.balance?.toString() || '0',
                      balanceFormatted: parseFloat(asset.balance || '0') || 0,
                      valueUSD: parseFloat(asset.value || asset.valueUSD || '0') || 0,
                      lastUpdated: Date.now(),
                    };
                  }).filter((asset: any) => (asset.valueUSD || 0) > 0);

                  if (userAssets.length > 0) {
                    usingRealAssets = true;
                  }
                }
              }
            }
          }
        } catch (octavError) {
          console.warn('Could not fetch assets from Octav wallet API, using sample assets:', octavError);
        }
      }

      // Fall back to sample assets if no real assets found
      if (userAssets.length === 0) {
        const skaito = tokenAddresses.find(t => t.symbol === 'sKAITO');
        const usde = tokenAddresses.find(t => t.symbol === 'USDe');

        userAssets = [
          skaito && {
            token: {
              address: skaito.address,
              symbol: skaito.symbol,
              name: skaito.name,
              decimals: skaito.decimals,
              chainId: skaito.chainId,
              priceUSD: skaito.priceUSD,
            },
            balance: '1000000000000000000',
            balanceFormatted: 1,
            valueUSD: 1000,
            lastUpdated: Date.now(),
          },
          usde && {
            token: {
              address: usde.address,
              symbol: usde.symbol,
              name: usde.name,
              decimals: usde.decimals,
              chainId: usde.chainId,
              priceUSD: usde.priceUSD,
            },
            balance: '500000000000000000000',
            balanceFormatted: 500,
            valueUSD: 500,
            lastUpdated: Date.now(),
          },
        ].filter(Boolean) as any[];
      }

      // Add all USD stablecoins to get recommendations for suggested assets
      const userAssetSymbols = userAssets.map(a => a.token.symbol);
      const missingStablecoins = USD_STABLECOINS.filter(symbol => !userAssetSymbols.includes(symbol));

      const suggestedAssets = missingStablecoins.map(symbol => {
        const tokenInfo = tokenAddresses.find(t => t.symbol === symbol);
        if (tokenInfo) {
          return {
            token: {
              address: tokenInfo.address,
              symbol: tokenInfo.symbol,
              name: tokenInfo.name,
              decimals: tokenInfo.decimals,
              chainId: tokenInfo.chainId,
              priceUSD: tokenInfo.priceUSD || 1,
            },
            balance: '1000000000000000000',
            balanceFormatted: 1,
            valueUSD: 1,
            lastUpdated: Date.now(),
          };
        }
        return null;
      }).filter(Boolean);

      const allAssetsForRecommendation = [...userAssets, ...suggestedAssets];

      const body = {
        assets: allAssetsForRecommendation,
        riskLevel: 'neutral',
        chainId: 8453,
      };

      const response = await fetch('/api/pendle/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        const allRecommendations = data.data.recommendations || [];
        const userAssetSymbols = userAssets.map(a => a.token.symbol);

        const userAssetRecs = allRecommendations.filter((rec: any) =>
          userAssetSymbols.includes(rec.asset?.symbol)
        );

        const suggestedAssetRecs = allRecommendations.filter((rec: any) =>
          USD_STABLECOINS.includes(rec.asset?.symbol) && !userAssetSymbols.includes(rec.asset?.symbol)
        );

        setResult({
          ...data.data,
          recommendations: allRecommendations,
          userAssetRecommendations: userAssetRecs,
          suggestedAssetRecommendations: suggestedAssetRecs,
          _metadata: {
            usingRealAssets,
            assetCount: userAssets.length,
            walletAddress: walletAddress || 'none',
            totalRecommendations: allRecommendations.length,
            userAssetsCount: userAssetRecs.length,
            suggestedAssetsCount: suggestedAssetRecs.length,
          },
        });
      } else {
        setError(data.error || 'Failed to generate recommendations');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter recommendations based on filter criteria
  const filteredResult = useMemo(() => {
    if (!result) return null;

    const filterRecommendation = (rec: any) => {
      const apy = (rec.strategy?.expectedAPY || 0) / 100;

      // APY filter
      if (apy < minAPY || apy > maxAPY) return false;

      // Maturity filter
      const pool = rec.pools?.bestPT || rec.pools?.bestYT;
      if (pool?.maturity) {
        const maturityDate = new Date(pool.maturity * 1000);
        const daysUntilMaturity = Math.floor((maturityDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysUntilMaturity > maxMaturityDays) return false;
      }

      // Risk level filter
      const riskLevel = rec.strategy?.riskLevel || 'moderate';
      if (!selectedRiskLevels.includes(riskLevel.toLowerCase())) return false;

      return true;
    };

    const filteredUserRecs = result.userAssetRecommendations?.filter(filterRecommendation) || [];
    const filteredSuggestedRecs = result.suggestedAssetRecommendations?.filter(filterRecommendation) || [];
    const filteredAllRecs = result.recommendations?.filter(filterRecommendation) || [];

    return {
      ...result,
      userAssetRecommendations: filteredUserRecs,
      suggestedAssetRecommendations: filteredSuggestedRecs,
      recommendations: filteredAllRecs,
      _metadata: {
        ...result._metadata,
        totalRecommendations: filteredAllRecs.length,
        userAssetsCount: filteredUserRecs.length,
        suggestedAssetsCount: filteredSuggestedRecs.length,
      },
    };
  }, [result, minAPY, maxAPY, maxMaturityDays, selectedRiskLevels]);

  // Scanner filter and sort logic
  const filteredPools = useMemo(() => {
    let filtered = [...pools];

    // Apply tag filter
    if (filterTag !== 'all') {
      filtered = filtered.filter(pool => pool.strategyTag === filterTag);
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(pool =>
        pool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pool.underlyingAsset.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'apy-high':
          return b.apy - a.apy;
        case 'apy-low':
          return a.apy - b.apy;
        case 'tvl-high':
          return b.tvl - a.tvl;
        case 'tvl-low':
          return a.tvl - b.tvl;
        case 'maturity-soon':
          return a.daysToMaturity - b.daysToMaturity;
        case 'maturity-far':
          return b.daysToMaturity - a.daysToMaturity;
        default:
          return 0;
      }
    });

    return filtered;
  }, [pools, sortBy, filterTag, searchQuery]);

  const stats = useMemo(() => {
    if (pools.length === 0) return { totalTVL: 0, avgAPY: 0, highestAPY: 0 };

    const totalTVL = pools.reduce((sum, pool) => sum + pool.tvl, 0);
    const avgAPY = pools.reduce((sum, pool) => sum + (pool.apy / 100), 0) / pools.length;
    const highestAPY = Math.max(...pools.map(pool => pool.apy / 100));

    return { totalTVL, avgAPY, highestAPY };
  }, [pools]);

  // Auto-load recommendations on mount if wallet connected
  React.useEffect(() => {
    if (isConnected && activeTab === 'recommendations' && !result) {
      loadRecommendations();
    }
  }, [isConnected, activeTab]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Yield Opportunities"
          subtitle="Discover and invest in Pendle PT/YT strategies"
          showNavigation={true}
        />

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md mb-6">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
                activeTab === 'recommendations'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Zap className="w-5 h-5" />
                <span>Smart Recommendations</span>
                {filteredResult?._metadata && activeTab === 'recommendations' && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                    {filteredResult._metadata.totalRecommendations}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('scanner')}
              className={`flex-1 py-4 px-6 text-sm font-medium transition-colors ${
                activeTab === 'scanner'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <TrendingUp className="w-5 h-5" />
                <span>Market Scanner</span>
                {activeTab === 'scanner' && pools.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                    {pools.length}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Filters */}
        {result && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md mb-6 overflow-hidden">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="font-medium text-gray-900 dark:text-white">Filters</span>
                {(minAPY > 0 || maxAPY < 100 || maxMaturityDays < 365 || selectedRiskLevels.length < 3) && (
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                    Active
                  </span>
                )}
              </div>
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                {showFilters ? 'Hide' : 'Show'}
              </span>
            </button>

            {showFilters && (
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 space-y-6">
                {/* APY Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    APY Range: {minAPY}% - {maxAPY}%
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Min APY</label>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={minAPY}
                        onChange={(e) => setMinAPY(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{minAPY}%</div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Max APY</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={maxAPY}
                        onChange={(e) => setMaxAPY(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{maxAPY}%</div>
                    </div>
                  </div>
                </div>

                {/* Maturity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Max Maturity: {maxMaturityDays} days
                  </label>
                  <input
                    type="range"
                    min="30"
                    max="365"
                    step="30"
                    value={maxMaturityDays}
                    onChange={(e) => setMaxMaturityDays(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>30 days</span>
                    <span>{maxMaturityDays} days</span>
                    <span>365 days</span>
                  </div>
                </div>

                {/* Risk Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Risk Level
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['conservative', 'moderate', 'aggressive'].map((level) => {
                      const isSelected = selectedRiskLevels.includes(level);
                      return (
                        <button
                          key={level}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedRiskLevels(selectedRiskLevels.filter(l => l !== level));
                            } else {
                              setSelectedRiskLevels([...selectedRiskLevels, level]);
                            }
                          }}
                          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Reset Filters */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setMinAPY(0);
                      setMaxAPY(100);
                      setMaxMaturityDays(365);
                      setSelectedRiskLevels(['conservative', 'moderate', 'aggressive']);
                    }}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                  >
                    Reset all filters
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'recommendations' && (
          <div>
            {!isConnected ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center shadow-md">
                <div className="text-6xl mb-4">🔐</div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Connect Your Wallet
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Connect your wallet to get personalized yield recommendations based on your holdings
                </p>
              </div>
            ) : (
              <>
                {!result && !isLoading && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center shadow-md">
                    <Zap className="w-16 h-16 mx-auto text-blue-600 dark:text-blue-400 mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      Ready to Find Opportunities
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Get personalized yield strategies based on your wallet holdings
                    </p>
                    <button
                      onClick={loadRecommendations}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Load Recommendations
                    </button>
                  </div>
                )}

                {isLoading && <LoadingState message="Finding best yield opportunities for you..." />}

                {error && (
                  <ErrorState
                    title="Failed to Load Recommendations"
                    message={error}
                  />
                )}

                {filteredResult && (
                  <RecommendationResults
                    result={filteredResult}
                    purchasedPositions={purchasedPositions}
                    setPurchasedPositions={setPurchasedPositions}
                    ratioAdjustments={ratioAdjustments}
                    setRatioAdjustments={setRatioAdjustments}
                  />
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'scanner' && (
          <div>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <StatCard
                title="Total TVL"
                value={stats.totalTVL}
                subtitle={`Across ${pools.length} pools`}
                gradient="blue"
              />
              <StatCard
                title="Highest APY"
                value={`${stats.highestAPY.toFixed(2)}%`}
                subtitle="Best opportunity"
                gradient="green"
              />
              <StatCard
                title="Average APY"
                value={`${stats.avgAPY.toFixed(2)}%`}
                subtitle="Across all pools"
                gradient="purple"
              />
            </div>

            {/* Filters and Search */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6 shadow-md">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                {/* Search */}
                <div className="flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Search pools..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Filter Tags */}
                <div className="flex flex-wrap gap-2">
                  {(['all', 'Best PT', 'Best YT', 'Risky', 'Neutral'] as const).map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setFilterTag(tag)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        filterTag === tag
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {tag === 'all' ? 'All Pools' : tag}
                    </button>
                  ))}
                </div>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="apy-high">APY: High to Low</option>
                  <option value="apy-low">APY: Low to High</option>
                  <option value="tvl-high">TVL: High to Low</option>
                  <option value="tvl-low">TVL: Low to High</option>
                  <option value="maturity-soon">Maturity: Soonest</option>
                  <option value="maturity-far">Maturity: Furthest</option>
                </select>

                {/* Refresh */}
                <button
                  onClick={refreshPools}
                  disabled={poolsLoading}
                  className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                  title="Refresh pools"
                >
                  🔄
                </button>
              </div>
            </div>

            {/* Results Count */}
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredPools.length} of {pools.length} pools
            </div>

            {/* Loading State */}
            {poolsLoading && <LoadingState message="Loading pools..." />}

            {/* Error State */}
            {poolsError && (
              <ErrorState
                title="Failed to Load Pools"
                message={poolsError}
              />
            )}

            {/* Pools Grid */}
            {!poolsLoading && !poolsError && filteredPools.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPools.map((pool) => (
                  <PoolCard
                    key={pool.address}
                    pool={pool}
                    onSelect={setSelectedPool}
                  />
                ))}
              </div>
            )}

            {/* No Results */}
            {!poolsLoading && !poolsError && filteredPools.length === 0 && pools.length > 0 && (
              <EmptyState
                title="No pools found"
                message="No pools match your current filters. Try adjusting your search criteria."
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Recommendation Results Component
function RecommendationResults({
  result,
  purchasedPositions,
  setPurchasedPositions,
  ratioAdjustments,
  setRatioAdjustments,
}: any) {
  return (
    <div>
      {result._metadata && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                {result._metadata.usingRealAssets ? (
                  <>✅ Found {result._metadata.totalRecommendations} opportunities based on your {result._metadata.assetCount} holdings</>
                ) : (
                  <>📝 Showing sample opportunities (connect wallet for personalized recommendations)</>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Best APY: {(result.bestOverallAPY / 100)?.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <Accordion>
          {/* Your Assets to Buy In */}
          {result.userAssetRecommendations && result.userAssetRecommendations.length > 0 && (
            <AccordionItem
              title="Your Assets - Ready to Invest"
              badge={result.userAssetRecommendations.length}
              defaultOpen={true}
            >
              <div className="space-y-4">
                {result.userAssetRecommendations.map((rec: any, index: number) => {
                  const recId = `user-rec-${index}-${rec.asset?.symbol}`;
                  const isPurchased = purchasedPositions.some((p: any) => p.id === recId);
                  const adjustment = ratioAdjustments[recId] || rec.strategy?.allocation || { pt: 50, yt: 50 };

                  return (
                    <RecommendationCard
                      key={recId}
                      rec={rec}
                      recId={recId}
                      isPurchased={isPurchased}
                      ptPercent={adjustment.pt}
                      ytPercent={adjustment.yt}
                      ratioAdjustments={ratioAdjustments}
                      setRatioAdjustments={setRatioAdjustments}
                      setPurchasedPositions={setPurchasedPositions}
                    />
                  );
                })}
              </div>
            </AccordionItem>
          )}

          {/* Suggested Assets to Buy In */}
          {result.suggestedAssetRecommendations && result.suggestedAssetRecommendations.length > 0 && (
            <AccordionItem
              title="Suggested USD Stablecoins"
              badge={result.suggestedAssetRecommendations.length}
              defaultOpen={result.userAssetRecommendations?.length === 0}
            >
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  💡 Diversify your portfolio with these USD stablecoin opportunities
                </p>
                {result.suggestedAssetRecommendations.map((rec: any, index: number) => {
                  const recId = `suggested-rec-${index}-${rec.asset?.symbol}`;
                  const isPurchased = purchasedPositions.some((p: any) => p.id === recId);
                  const adjustment = ratioAdjustments[recId] || rec.strategy?.allocation || { pt: 50, yt: 50 };

                  return (
                    <RecommendationCard
                      key={recId}
                      rec={rec}
                      recId={recId}
                      isPurchased={isPurchased}
                      ptPercent={adjustment.pt}
                      ytPercent={adjustment.yt}
                      ratioAdjustments={ratioAdjustments}
                      setRatioAdjustments={setRatioAdjustments}
                      setPurchasedPositions={setPurchasedPositions}
                    />
                  );
                })}
              </div>
            </AccordionItem>
          )}
        </Accordion>
      </div>
    </div>
  );
}

// Recommendation Card Component
function RecommendationCard({
  rec,
  recId,
  isPurchased,
  ptPercent,
  ytPercent,
  ratioAdjustments,
  setRatioAdjustments,
  setPurchasedPositions,
}: any) {
  return (
    <div
      className={`p-5 rounded-xl border-2 transition-all ${
        isPurchased
          ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-300 dark:border-green-700'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h5 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            {rec.asset?.symbol}
          </h5>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {rec.strategy?.recommended} • APY: {(rec.strategy?.expectedAPY / 100)?.toFixed(2)}%
          </p>
        </div>
        {isPurchased && (
          <span className="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
            Invested
          </span>
        )}
      </div>

      {/* Enhanced Strategy Card */}
      {!isPurchased ? (() => {
        const pool = rec.pools?.bestPT || rec.pools?.bestYT;
        if (!pool) return null;

        const isValidAddress = (str: string | undefined): boolean => {
          if (!str) return false;
          if (/^0x[a-fA-F0-9]{40}$/.test(str)) return true;
          if (str.includes('-')) {
            const addr = str.split('-').pop();
            return addr ? /^0x[a-fA-F0-9]{40}$/.test(addr) : false;
          }
          return false;
        };

        const potentialAddress = rec._market?.underlyingAsset?.address ||
          pool.underlyingAsset?.address ||
          (typeof pool.underlyingAsset === 'string' ? pool.underlyingAsset : undefined);

        const tokenAddress = isValidAddress(potentialAddress) ? potentialAddress : undefined;

        return (
          <EnhancedStrategyCard
            poolName={pool.name || `${rec.asset?.symbol} Pool`}
            maturity={pool.maturity ? new Date(pool.maturity * 1000).toLocaleDateString() : 'N/A'}
            ptPercentage={ptPercent / 100}
            ytPercentage={ytPercent / 100}
            score={75}
            riskFactor={0.3}
            comment={rec.strategy?.reasoning || 'No additional details'}
            apy7d={(pool.apy || 0) / 100}
            apy30d={(pool.apy || 0) / 100}
            pool={pool}
            tokenAddress={tokenAddress}
          />
        );
      })() : (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
          <p className="text-sm font-semibold text-green-700 dark:text-green-300">
            ✅ Active investment in your portfolio
          </p>
        </div>
      )}
    </div>
  );
}
