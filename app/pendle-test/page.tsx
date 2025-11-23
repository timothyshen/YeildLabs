'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EnhancedStrategyCard } from '@/components/strategy/EnhancedStrategyCard';
import { NetworkBadge } from '@/components/ui/NetworkBadge';
import type { PendlePool } from '@/types';
import { fetchMarkets } from '@/lib/pendle/apiClient';

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

export default function PendleTestPage() {
  const { address: connectedAddress, isConnected } = useAccount();
  const [testType, setTestType] = useState<'pools' | 'positions' | 'recommend' | 'strategy'>('pools');
  const [address, setAddress] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchasedPositions, setPurchasedPositions] = useState<PurchasedPosition[]>([]);
  const [ratioAdjustments, setRatioAdjustments] = useState<Record<string, { pt: number; yt: number }>>({});

  const testPools = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/pendle/pools?chainId=8453');
      const data = await response.json();

      if (data.success) {
        setResult({
          count: data.data?.length || 0,
          pools: data.data?.slice(0, 5), // Show first 5
          all: data.data,
        });
      } else {
        setError(data.error || 'Failed to fetch pools');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const testPositions = async () => {
    // Use connected wallet address if available, otherwise use manual input
    const walletAddress = connectedAddress || address;
    
    if (!walletAddress) {
      setError('Please connect a wallet or enter a wallet address');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/pendle/positions?address=${walletAddress}&chainId=8453`);
      const data = await response.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || 'Failed to fetch positions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const testRecommend = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Use connected wallet address if available, otherwise use manual input
      const walletAddress = connectedAddress || address;
      let userAssets: any[] = [];
      let usingRealAssets = false;

      // Try to fetch real assets from Octav if wallet is connected
      if (walletAddress) {
        try {
          const octavResponse = await fetch(`/api/octav?address=${walletAddress}&includeImages=false&waitForSync=false`);
          const octavData = await octavResponse.json();

          if (octavData.success && octavData.data?.assets && octavData.data.assets.length > 0) {
            // Transform Octav assets to unified WalletAsset format
            userAssets = octavData.data.assets.map((asset: any) => {
              // Handle both legacy and unified formats
              if (asset.token && typeof asset.token === 'object') {
                // Already in unified format
                return {
                  token: asset.token,
                  balance: asset.balance?.toString() || '0',
                  balanceFormatted: asset.balanceFormatted || parseFloat(asset.balance || '0') || 0,
                  valueUSD: asset.valueUSD || 0,
                  lastUpdated: asset.lastUpdated || Date.now(),
                };
              } else {
                // Legacy format - transform to unified
                return {
                  token: {
                    address: asset.token || asset.address || '',
                    symbol: asset.symbol || '',
                    name: asset.name || asset.symbol || '',
                    decimals: asset.decimals || 18,
                    chainId: asset.chainId || 8453,
                    priceUSD: asset.priceUSD || asset.valueUSD || 0,
                  },
                  balance: asset.balance?.toString() || '0',
                  balanceFormatted: asset.balance || asset.balanceFormatted || 0,
                  valueUSD: asset.valueUSD || 0,
                  lastUpdated: Date.now(),
                };
              }
            }).filter((asset: any) => (asset.valueUSD || 0) > 0); // Filter out zero-value assets

            if (userAssets.length > 0) {
              usingRealAssets = true;
              console.log(`✅ Using ${userAssets.length} real assets from wallet`);
            }
          }
        } catch (octavError) {
          console.warn('⚠️ Could not fetch assets from Octav, using sample assets:', octavError);
        }
      }

      // Fall back to sample assets if no real assets found
      if (userAssets.length === 0) {
        userAssets = [
          {
            token: {
              address: '0x548d3b444da39686d1a6f1544781d154e7cd1ef7',
              symbol: 'sKAITO',
              name: 'sKAITO',
              decimals: 18,
              chainId: 8453,
              priceUSD: 1,
            },
            balance: '1000000000000000000',
            balanceFormatted: 1,
            valueUSD: 1000,
            lastUpdated: Date.now(),
          },
          {
            token: {
              address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
              symbol: 'USDC',
              name: 'USD Coin',
              decimals: 6,
              chainId: 8453,
              priceUSD: 1,
            },
            balance: '1000000000',
            balanceFormatted: 1000,
            valueUSD: 1000,
            lastUpdated: Date.now(),
          },
        ];
        console.log('📝 Using sample assets for testing');
      }

      const body = {
        assets: userAssets,
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
        // Add metadata about asset source
        setResult({
          ...data.data,
          _metadata: {
            usingRealAssets,
            assetCount: userAssets.length,
            walletAddress: walletAddress || 'none',
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

  const runTest = () => {
    switch (testType) {
      case 'pools':
        testPools();
        break;
      case 'positions':
        testPositions();
        break;
      case 'recommend':
        testRecommend();
        break;
      case 'strategy':
        // Strategy card test doesn't need API call
        setResult({ type: 'strategy' });
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <PageHeader
            title="Pendle API Test"
            subtitle="Test all Pendle API endpoints"
            showNavigation={false}
          />
          <NetworkBadge />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Select Test Type
          </h2>

          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setTestType('pools')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                testType === 'pools'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Test Pools
            </button>
            <button
              onClick={() => setTestType('positions')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                testType === 'positions'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Test Positions
            </button>
            <button
              onClick={() => setTestType('recommend')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                testType === 'recommend'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Test Recommendations
            </button>
            <button
              onClick={() => setTestType('strategy')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                testType === 'strategy'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Test Strategy Card
            </button>
          </div>

          {testType === 'positions' && (
            <div className="mb-4 space-y-3">
              {isConnected && connectedAddress ? (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm font-semibold text-green-900 dark:text-green-200 mb-1">
                    ✅ Using Connected Wallet
                  </p>
                  <p className="text-xs text-green-800 dark:text-green-100 font-mono">
                    {connectedAddress}
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                    Positions will be fetched automatically for this wallet.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Wallet Address (or connect a wallet)
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Connect a wallet to automatically use your address, or enter an address manually.
                  </p>
                </div>
              )}
            </div>
          )}

          {testType === 'recommend' && (
            <div className="mb-4 space-y-3">
              {isConnected && connectedAddress ? (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm font-semibold text-green-900 dark:text-green-200 mb-1">
                    ✅ Using Connected Wallet Assets
                  </p>
                  <p className="text-xs text-green-800 dark:text-green-100 font-mono">
                    {connectedAddress}
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                    Recommendations will be based on your actual wallet assets from Octav.
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                      💡 Connect a wallet or enter an address to use real assets
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Otherwise, sample assets (sKAITO and USDC) will be used for testing.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Wallet Address (Optional)
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="0x... (leave empty to use sample assets)"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {testType !== 'strategy' && (
            <button
              onClick={runTest}
              disabled={isLoading}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Testing...' : `Test ${testType.charAt(0).toUpperCase() + testType.slice(1)}`}
            </button>
          )}
          
          {testType === 'strategy' && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                💡 The Strategy Card component is displayed below. Try switching between Default and Advanced modes, adjusting the investment amount, and testing the execution flow.
              </p>
            </div>
          )}
        </div>

        {isLoading && <LoadingState message="Testing API..." />}

        {error && (
          <ErrorState
            title="Test Error"
            message={error}
          />
        )}

        {/* Strategy Card Test */}
        {testType === 'strategy' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Enhanced Strategy Card Test
            </h3>
            <div className="space-y-4">
              <EnhancedStrategyCard
                poolName="PT-wstETH-2024-12-27"
                maturity="120 days"
                ptPercentage={0.6}
                ytPercentage={0.4}
                score={85}
                riskFactor={0.75}
                comment="Balanced PT/YT positioning with strong yield trend"
                apy7d={0.125}
                apy30d={0.118}
                pool={{
                  address: '0x34280882267ffa6383b363e278b027be083bbe3b',
                  name: 'PT-wstETH-2024-12-27',
                  symbol: 'PT-wstETH',
                  underlyingAsset: {
                    address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
                    symbol: 'wstETH',
                    name: 'Wrapped Staked ETH',
                    decimals: 18,
                    chainId: 8453,
                    priceUSD: 1,
                  },
                  syToken: {
                    address: '0xcbc72d92b2dc8187414f6734718563898740c0bc',
                    symbol: 'SY-wstETH',
                    name: 'SY-wstETH',
                    decimals: 18,
                    chainId: 8453,
                    priceUSD: 1,
                  },
                  ptToken: {
                    address: '0xb253eff1104802b97ac7e3ac9fdd73aece295a2c',
                    symbol: 'PT-wstETH',
                    name: 'PT-wstETH',
                    decimals: 18,
                    chainId: 8453,
                    priceUSD: 0.95,
                  },
                  ytToken: {
                    address: '0x04b7fa1e727d7290d6e24fa9b426d0c940283a95',
                    symbol: 'YT-wstETH',
                    name: 'YT-wstETH',
                    decimals: 18,
                    chainId: 8453,
                    priceUSD: 0.05,
                  },
                  maturity: Math.floor(Date.now() / 1000) + (120 * 24 * 60 * 60),
                  maturityDate: new Date(Date.now() + (120 * 24 * 60 * 60 * 1000)).toISOString(),
                  daysToMaturity: 120,
                  isExpired: false,
                  tvl: 5000000,
                  apy: 12.5,
                  impliedYield: 11.8,
                  ptPrice: 0.95,
                  ytPrice: 0.05,
                  ptDiscount: 0.05,
                  syPrice: 1,
                  strategyTag: 'Neutral',
                  riskLevel: 'neutral',
                  updatedAt: Date.now(),
                }}
                onDetails={() => {
                  alert('Details clicked! This would open a detailed view.');
                }}
              />
              
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Test Instructions:
                </h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                  <li>Switch between Default and Advanced modes using the dropdown</li>
                  <li>Enter an investment amount (e.g., 1000)</li>
                  <li>In Advanced mode, adjust the PT/YT ratio slider</li>
                  <li>Set profit take and loss cut percentages in Advanced mode</li>
                  <li>Click "Execute Strategy" to test the mint transaction (requires connected wallet)</li>
                  <li>Check transaction status and explorer link after execution</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Test Results
            </h3>

            {testType === 'pools' && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Found {result.count} pools
                </p>
                <div className="space-y-2 mb-4">
                  {result.pools?.map((pool: any, index: number) => (
                    <div
                      key={index}
                      className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {pool.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {pool.underlyingAsset} • APY: {pool.apy?.toFixed(2)}% • TVL: ${(pool.tvl / 1000000).toFixed(2)}M
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {testType === 'positions' && (
              <div>
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                    Summary
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-100">
                    Positions: {result.summary?.totalPositions || 0}
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-100">
                    Total Value: ${result.summary?.totalValue?.toFixed(2) || 0}
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-100">
                    Total PnL: ${result.summary?.totalPnL?.toFixed(2) || 0}
                  </p>
                </div>
                <div className="space-y-2">
                  {result.positions?.map((pos: any, index: number) => (
                    <div
                      key={index}
                      className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {pos.pool?.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        PT: {pos.ptBalanceFormatted?.toFixed(4)} • YT: {pos.ytBalanceFormatted?.toFixed(4)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Value: ${pos.currentValue?.toFixed(2)} • PnL: {pos.pnlPercent?.toFixed(2)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {testType === 'recommend' && (
              <div>
                {result._metadata && (
                  <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {result._metadata.usingRealAssets ? (
                        <span className="text-green-600 dark:text-green-400">✅ Using {result._metadata.assetCount} real assets from wallet</span>
                      ) : (
                        <span className="text-blue-600 dark:text-blue-400">📝 Using sample assets for testing</span>
                      )}
                    </p>
                  </div>
                )}
                <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm font-semibold text-green-900 dark:text-green-200 mb-2">
                    Summary
                  </p>
                  <p className="text-sm text-green-800 dark:text-green-100">
                    Opportunities: {result.totalOpportunities || 0}
                  </p>
                  <p className="text-sm text-green-800 dark:text-green-100">
                    Best APY: {result.bestOverallAPY?.toFixed(2)}%
                  </p>
                  <p className="text-sm text-green-800 dark:text-green-100">
                    Potential Value: ${result.totalPotentialValue?.toFixed(2) || 0}
                  </p>
                </div>

                {/* Purchased Positions Section */}
                {purchasedPositions.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-md font-bold text-gray-900 dark:text-white mb-3">
                      Your Positions (Test Mode)
                    </h4>
                    <div className="space-y-3">
                      {purchasedPositions.map((pos) => (
                        <div
                          key={pos.id}
                          className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-800"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-bold text-gray-900 dark:text-white">
                                {pos.assetSymbol} - {pos.poolName}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                Purchased: ${pos.purchaseAmount.toFixed(2)} • {new Date(pos.purchaseDate).toLocaleDateString()}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                setPurchasedPositions(prev => prev.filter(p => p.id !== pos.id));
                                setRatioAdjustments(prev => {
                                  const newRatios = { ...prev };
                                  delete newRatios[pos.id];
                                  return newRatios;
                                });
                              }}
                              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
                            >
                              Sell
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                              <p className="text-xs text-gray-600 dark:text-gray-400">PT Allocation</p>
                              <p className="text-lg font-bold text-gray-900 dark:text-white">{pos.ptAllocation}%</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">${(pos.purchaseAmount * pos.ptAllocation / 100).toFixed(2)}</p>
                            </div>
                            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                              <p className="text-xs text-gray-600 dark:text-gray-400">YT Allocation</p>
                              <p className="text-lg font-bold text-gray-900 dark:text-white">{pos.ytAllocation}%</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">${(pos.purchaseAmount * pos.ytAllocation / 100).toFixed(2)}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Expected APY:</span>
                            <span className="font-bold text-green-600 dark:text-green-400">{pos.expectedAPY.toFixed(2)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations Section */}
                <div className="space-y-4">
                  <h4 className="text-md font-bold text-gray-900 dark:text-white">
                    Recommendations
                  </h4>
                  {result.recommendations?.map((rec: any, index: number) => {
                    const recId = `rec-${index}-${rec.asset?.symbol}`;
                    const isPurchased = purchasedPositions.some(p => p.id === recId);
                    const adjustment = ratioAdjustments[recId] || rec.strategy?.allocation || { pt: 50, yt: 50 };
                    const ptPercent = adjustment.pt;
                    const ytPercent = adjustment.yt;

                    return (
                      <div
                        key={index}
                        className={`p-5 rounded-xl border-2 transition-all ${
                          isPurchased
                            ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-300 dark:border-green-700'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg'
                        }`}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h5 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                              {rec.asset?.symbol}
                            </h5>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Balance: {rec.asset?.balance?.toFixed(4) || 0} • Value: ${rec.asset?.valueUSD?.toFixed(2) || 0}
                            </p>
                          </div>
                          {isPurchased && (
                            <span className="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
                              Purchased
                            </span>
                          )}
                        </div>

                        {/* Strategy Info */}
                        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                              Recommended Strategy: {rec.strategy?.recommended}
                            </p>
                            <p className="text-sm font-bold text-blue-900 dark:text-blue-200">
                              APY: {rec.strategy?.expectedAPY?.toFixed(2)}%
                            </p>
                          </div>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                            {rec.strategy?.reasoning}
                          </p>

                          {/* Ratio Slider */}
                          {!isPurchased && (
                            <div className="mt-4">
                              <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Adjust PT/YT Ratio
                                </label>
                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                  PT {ptPercent}% / YT {ytPercent}%
                                </span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={ptPercent}
                                onChange={(e) => {
                                  const newPt = parseInt(e.target.value);
                                  setRatioAdjustments(prev => ({
                                    ...prev,
                                    [recId]: { pt: newPt, yt: 100 - newPt }
                                  }));
                                }}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                style={{
                                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${ptPercent}%, #10b981 ${ptPercent}%, #10b981 100%)`
                                }}
                              />
                              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                                <span>100% PT</span>
                                <span>50/50</span>
                                <span>100% YT</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Pool Details */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          {rec.pools?.bestPT && (
                            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Best PT Pool</p>
                              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{rec.pools.bestPT.name}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                APY: {rec.pools.bestPT.apy?.toFixed(2)}% • Discount: {(rec.pools.bestPT.ptDiscount * 100).toFixed(2)}%
                              </p>
                            </div>
                          )}
                          {rec.pools?.bestYT && (
                            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Best YT Pool</p>
                              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{rec.pools.bestYT.name}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                APY: {rec.pools.bestYT.apy?.toFixed(2)}% • Maturity: {rec.pools.bestYT.daysToMaturity}d
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Enhanced Strategy Card - Replace simple button */}
                        {!isPurchased ? (
                          <div className="mt-4">
                            <EnhancedStrategyCard
                              poolName={rec.pools?.bestPT?.name || rec.pools?.bestYT?.name || 'Unknown Pool'}
                              maturity={`${rec.pools?.bestPT?.daysToMaturity || rec.pools?.bestYT?.daysToMaturity || 0} days`}
                              ptPercentage={ptPercent / 100}
                              ytPercentage={ytPercent / 100}
                              score={85}
                              riskFactor={0.75}
                              comment={rec.strategy?.reasoning || 'Balanced PT/YT positioning'}
                              apy7d={(rec.pools?.bestPT?.apy || rec.pools?.bestYT?.apy || 0) / 100}
                              apy30d={(rec.pools?.bestPT?.apy || rec.pools?.bestYT?.apy || 0) / 100}
                              pool={rec.pools?.bestPT || rec.pools?.bestYT || {
                                address: rec.pools?.bestPT?.address || rec.pools?.bestYT?.address || '',
                                name: rec.pools?.bestPT?.name || rec.pools?.bestYT?.name || '',
                                symbol: rec.pools?.bestPT?.symbol || rec.pools?.bestYT?.symbol || '',
                                underlyingAsset: {
                                  address: rec.asset?.token?.address || '',
                                  symbol: rec.asset?.symbol || '',
                                  name: rec.asset?.symbol || '',
                                  decimals: 18,
                                  chainId: 8453,
                                  priceUSD: 1,
                                },
                                syToken: {
                                  address: rec.pools?.bestPT?.syToken?.address || '',
                                  symbol: rec.pools?.bestPT?.syToken?.symbol || '',
                                  name: rec.pools?.bestPT?.syToken?.name || '',
                                  decimals: 18,
                                  chainId: 8453,
                                  priceUSD: 1,
                                },
                                ptToken: {
                                  address: rec.pools?.bestPT?.ptToken?.address || '',
                                  symbol: rec.pools?.bestPT?.ptToken?.symbol || '',
                                  name: rec.pools?.bestPT?.ptToken?.name || '',
                                  decimals: 18,
                                  chainId: 8453,
                                  priceUSD: rec.pools?.bestPT?.ptPrice || 0.95,
                                },
                                ytToken: {
                                  address: rec.pools?.bestPT?.ytToken?.address || '',
                                  symbol: rec.pools?.bestPT?.ytToken?.symbol || '',
                                  name: rec.pools?.bestPT?.ytToken?.name || '',
                                  decimals: 18,
                                  chainId: 8453,
                                  priceUSD: rec.pools?.bestPT?.ytPrice || 0.05,
                                },
                                maturity: Math.floor(Date.now() / 1000) + ((rec.pools?.bestPT?.daysToMaturity || 120) * 24 * 60 * 60),
                                maturityDate: new Date(Date.now() + ((rec.pools?.bestPT?.daysToMaturity || 120) * 24 * 60 * 60 * 1000)).toISOString(),
                                daysToMaturity: rec.pools?.bestPT?.daysToMaturity || 120,
                                isExpired: false,
                                tvl: rec.pools?.bestPT?.tvl || 0,
                                apy: rec.pools?.bestPT?.apy || rec.pools?.bestYT?.apy || 0,
                                impliedYield: rec.pools?.bestPT?.impliedYield || 0,
                                ptPrice: rec.pools?.bestPT?.ptPrice || 0.95,
                                ytPrice: rec.pools?.bestPT?.ytPrice || 0.05,
                                ptDiscount: rec.pools?.bestPT?.ptDiscount || 0.05,
                                syPrice: 1,
                                strategyTag: 'Neutral',
                                riskLevel: 'neutral',
                                updatedAt: Date.now(),
                              }}
                              onDetails={() => {
                                alert(`Pool Details: ${rec.pools?.bestPT?.name || rec.pools?.bestYT?.name}`);
                              }}
                            />
                          </div>
                        ) : (
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                            <p className="text-sm text-green-800 dark:text-green-200">
                              ✅ Position purchased! Use the "Sell" button above to close.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400">
                View Raw JSON
              </summary>
              <pre className="mt-2 p-4 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-auto text-xs">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        )}

        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2">
            💡 Testing Tips
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
            <li><strong>Pools:</strong> Tests fetching all Pendle pools from API</li>
            <li><strong>Positions:</strong> Requires a wallet address with Pendle positions on Base</li>
            <li><strong>Recommendations:</strong> Tests with sample assets (sKAITO and USDC) to show matching pools and strategy suggestions</li>
            <li><strong>Strategy Card:</strong> Tests the Enhanced Strategy Card component with mode toggle, ratio adjustment, and execution flow</li>
            <li>Check browser console and server logs for detailed information</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

