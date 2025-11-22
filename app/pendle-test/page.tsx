'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';

export default function PendleTestPage() {
  const [testType, setTestType] = useState<'pools' | 'positions' | 'recommend'>('pools');
  const [address, setAddress] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!address) {
      setError('Please enter a wallet address');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/pendle/positions?address=${address}&chainId=8453`);
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
      const body: any = {
        riskLevel: 'neutral',
        chainId: 8453,
      };

      if (address) {
        body.address = address;
      } else {
        // Use sample assets
        body.assets = [
          {
            token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            symbol: 'USDC',
            balance: 1000,
            valueUSD: 1000,
          },
          {
            token: '0x...',
            symbol: 'sUSDe',
            balance: 500,
            valueUSD: 500,
          },
        ];
      }

      const response = await fetch('/api/pendle/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
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
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Pendle API Test"
          subtitle="Test all Pendle API endpoints"
          showNavigation={false}
        />

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
          </div>

          {(testType === 'positions' || testType === 'recommend') && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Wallet Address (Optional for Recommendations)
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          )}

          <button
            onClick={runTest}
            disabled={isLoading}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Testing...' : `Test ${testType.charAt(0).toUpperCase() + testType.slice(1)}`}
          </button>
        </div>

        {isLoading && <LoadingState message="Testing API..." />}

        {error && (
          <ErrorState
            title="Test Error"
            message={error}
          />
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
                <div className="space-y-4">
                  {result.recommendations?.map((rec: any, index: number) => (
                    <div
                      key={index}
                      className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <p className="font-semibold text-gray-900 dark:text-white mb-2">
                        {rec.asset?.symbol}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Balance: {rec.asset?.balance} • Value: ${rec.asset?.valueUSD?.toFixed(2)}
                      </p>
                      <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                          Strategy: {rec.strategy?.recommended}
                        </p>
                        <p className="text-sm text-blue-800 dark:text-blue-100">
                          Allocation: PT {rec.strategy?.allocation?.pt}% / YT {rec.strategy?.allocation?.yt}%
                        </p>
                        <p className="text-sm text-blue-800 dark:text-blue-100">
                          Expected APY: {rec.strategy?.expectedAPY?.toFixed(2)}%
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                          {rec.strategy?.reasoning}
                        </p>
                      </div>
                    </div>
                  ))}
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
            <li><strong>Recommendations:</strong> Can use wallet address or sample assets</li>
            <li>Check browser console and server logs for detailed information</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

