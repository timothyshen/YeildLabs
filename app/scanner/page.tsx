'use client';

import { useState, useMemo } from 'react';
import { usePendlePools } from '@/lib/hooks/usePendlePools';
import { PoolCard } from '@/components/scanner/PoolCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import type { PendlePool } from '@/types';

type SortOption = 'apy-high' | 'apy-low' | 'tvl-high' | 'tvl-low' | 'maturity-soon' | 'maturity-far';
type FilterTag = 'all' | 'Best PT' | 'Best YT' | 'Risky' | 'Neutral';

export default function ScannerPage() {
  const { pools, isLoading, error, refreshPools } = usePendlePools(true);
  const [sortBy, setSortBy] = useState<SortOption>('apy-high');
  const [filterTag, setFilterTag] = useState<FilterTag>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPool, setSelectedPool] = useState<PendlePool | null>(null);

  // Filter and sort pools
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
    const avgAPY = pools.reduce((sum, pool) => sum + pool.apy, 0) / pools.length;
    const highestAPY = Math.max(...pools.map(pool => pool.apy));

    return { totalTVL, avgAPY, highestAPY };
  }, [pools]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Stablecoin Yield Scanner"
          subtitle="Discover the best Pendle yield opportunities for stablecoins"
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6">
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
              {(['all', 'Best PT', 'Best YT', 'Risky', 'Neutral'] as FilterTag[]).map((tag) => (
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
              onChange={(e) => setSortBy(e.target.value as SortOption)}
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
              disabled={isLoading}
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
        {isLoading && <LoadingState message="Loading pools..." />}

        {/* Error State */}
        {error && (
          <ErrorState
            message={error}
            onRetry={refreshPools}
          />
        )}

        {/* Pools Grid */}
        {!isLoading && !error && (
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
        {!isLoading && !error && filteredPools.length === 0 && (
          <EmptyState
            icon="🔍"
            title="No pools found"
            description="No pools match your current filters. Try adjusting your search criteria."
            action={{
              label: 'Clear Filters',
              onClick: () => {
                setFilterTag('all');
                setSearchQuery('');
              },
              variant: 'primary',
            }}
          />
        )}
      </div>
    </div>
  );
}
