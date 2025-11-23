'use client';

import React, { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { EnhancedPositionCard } from '@/components/dashboard/EnhancedPositionCard';
import { PositionsTable } from '@/components/dashboard/PositionsTable';
import { ExitToUSDC } from '@/components/dashboard/ExitToUSDC';
import { PerformanceTracking } from '@/components/dashboard/PerformanceTracking';
import { StatCard } from '@/components/ui/StatCard';
import { PositionCardSkeletonGrid } from '@/components/dashboard/PositionCardSkeleton';
import { SlidersHorizontal, LayoutGrid, List, TrendingUp, Clock, AlertCircle } from 'lucide-react';

type ViewMode = 'grid' | 'table';
type SortOption = 'value' | 'apy' | 'maturity' | 'pnl';
type FilterStatus = 'all' | 'active' | 'maturing-soon' | 'high-yield';

export default function PortfolioPage() {
  const { address: connectedAddress, isConnected } = useAccount();

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('value');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [positions, setPositions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [minAPY, setMinAPY] = useState<number>(0);
  const [maxAPY, setMaxAPY] = useState<number>(100);
  const [positionTypes, setPositionTypes] = useState<string[]>(['PT', 'YT', 'LP']);

  // Load positions
  React.useEffect(() => {
    if (isConnected && connectedAddress) {
      loadPositions();
    }
  }, [isConnected, connectedAddress]);

  const loadPositions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/pendle/positions?address=${connectedAddress}&chainId=8453`);
      const data = await response.json();

      if (data.success) {
        // API returns { summary: {...}, positions: [...] }
        setPositions(data.data?.positions || []);
        setSummary(data.data?.summary || null);
      } else {
        setError(data.error || 'Failed to load positions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate portfolio metrics
  const metrics = useMemo(() => {
    // Use summary from API if available
    if (summary) {
      const maturingSoon = positions.filter(p => {
        if (p.pool?.maturity) {
          const daysUntilMaturity = Math.floor((p.pool.maturity * 1000 - Date.now()) / (1000 * 60 * 60 * 24));
          return daysUntilMaturity <= 30 && daysUntilMaturity > 0;
        }
        return false;
      }).length;

      const avgAPY = positions.length > 0
        ? positions.reduce((sum, p) => sum + (p.pool?.apy || 0), 0) / positions.length
        : 0;

      return {
        totalValue: summary.totalValue || 0,
        totalPnL: summary.totalPnL || 0,
        avgAPY,
        maturingSoon,
      };
    }

    // Fallback calculation if no summary
    if (!Array.isArray(positions)) {
      return { totalValue: 0, totalPnL: 0, avgAPY: 0, maturingSoon: 0 };
    }

    const totalValue = positions.reduce((sum, p) => sum + (p.currentValue || 0), 0);
    const totalPnL = positions.reduce((sum, p) => sum + (p.unrealizedPnL || 0), 0);
    const avgAPY = positions.length > 0
      ? positions.reduce((sum, p) => sum + (p.pool?.apy || 0), 0) / positions.length
      : 0;

    const maturingSoon = positions.filter(p => {
      if (p.pool?.maturity) {
        const daysUntilMaturity = Math.floor((p.pool.maturity * 1000 - Date.now()) / (1000 * 60 * 60 * 24));
        return daysUntilMaturity <= 30 && daysUntilMaturity > 0;
      }
      return false;
    }).length;

    return { totalValue, totalPnL, avgAPY, maturingSoon };
  }, [positions, summary]);

  // Filter and sort positions
  const filteredPositions = useMemo(() => {
    if (!Array.isArray(positions)) {
      return [];
    }

    let filtered = [...positions];

    // Apply status filter
    if (filterStatus === 'active') {
      filtered = filtered.filter(p => !p.pool?.isExpired);
    } else if (filterStatus === 'maturing-soon') {
      filtered = filtered.filter(p => {
        if (p.pool?.maturity) {
          const daysUntilMaturity = Math.floor((p.pool.maturity * 1000 - Date.now()) / (1000 * 60 * 60 * 24));
          return daysUntilMaturity <= 30 && daysUntilMaturity > 0;
        }
        return false;
      });
    } else if (filterStatus === 'high-yield') {
      filtered = filtered.filter(p => (p.pool?.apy || 0) >= 15);
    }

    // Apply APY filter
    filtered = filtered.filter(p => {
      const apy = p.pool?.apy || 0;
      return apy >= minAPY && apy <= maxAPY;
    });

    // Apply position type filter - check if has PT or YT balance
    filtered = filtered.filter(p => {
      const hasPT = (p.ptBalanceFormatted || 0) > 0;
      const hasYT = (p.ytBalanceFormatted || 0) > 0;

      if (positionTypes.includes('PT') && hasPT) return true;
      if (positionTypes.includes('YT') && hasYT) return true;
      if (positionTypes.includes('LP') && hasPT && hasYT) return true;

      return false;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'value':
          return (b.currentValue || 0) - (a.currentValue || 0);
        case 'apy':
          return (b.pool?.apy || 0) - (a.pool?.apy || 0);
        case 'maturity':
          return (a.pool?.maturity || 0) - (b.pool?.maturity || 0);
        case 'pnl':
          return (b.unrealizedPnL || 0) - (a.unrealizedPnL || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [positions, filterStatus, minAPY, maxAPY, positionTypes, sortBy]);

  const handleManagePosition = (pool: string, action: 'roll' | 'exit' | 'add') => {
    console.log('Managing position:', pool, action);
    // TODO: Implement position management
  };

  const handleExitToUSDC = async (pools: string[]) => {
    console.log('Exiting positions:', pools);
    // TODO: Implement exit functionality
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Portfolio"
          subtitle="Manage your Pendle PT/YT positions and track performance"
          showNavigation={true}
        />

        {!isConnected ? (
          <div className="glass rounded-xl p-12 text-center shadow-lg">
            <div className="text-6xl mb-4">💼</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Connect Your Wallet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Connect your wallet to view and manage your Pendle positions
            </p>
          </div>
        ) : (
          <>
            {/* Portfolio Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <StatCard
                title="Total Position Value"
                value={metrics.totalValue}
                gradient="blue"
              />
              <StatCard
                title="Total P&L"
                value={metrics.totalPnL}
                gradient={metrics.totalPnL >= 0 ? 'green' : 'red'}
              />
              <StatCard
                title="Average APY"
                value={`${metrics.avgAPY.toFixed(2)}%`}
                gradient="purple"
              />
              <StatCard
                title="Maturing Soon"
                value={`${metrics.maturingSoon} positions`}
                gradient="orange"
              />
            </div>

            {/* Controls */}
            <div className="glass rounded-xl shadow-lg mb-6 p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                {/* Left side - Filters */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 dark:bg-white/5 dark:hover:bg-white/10 rounded-lg transition-all"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span className="text-sm font-medium">Filters</span>
                    {(minAPY > 0 || maxAPY < 100 || positionTypes.length < 3) && (
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                        Active
                      </span>
                    )}
                  </button>

                  {/* Status Filter Tabs */}
                  <div className="flex items-center gap-2">
                    {[
                      { value: 'all', label: 'All', icon: LayoutGrid },
                      { value: 'active', label: 'Active', icon: TrendingUp },
                      { value: 'maturing-soon', label: 'Maturing', icon: Clock },
                      { value: 'high-yield', label: 'High Yield', icon: AlertCircle },
                    ].map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setFilterStatus(value as FilterStatus)}
                        className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          filterStatus === value
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right side - Sort and View */}
                <div className="flex items-center gap-4">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="value">Sort by Value</option>
                    <option value="apy">Sort by APY</option>
                    <option value="maturity">Sort by Maturity</option>
                    <option value="pnl">Sort by P&L</option>
                  </select>

                  <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded ${
                        viewMode === 'grid'
                          ? 'bg-white dark:bg-gray-600 shadow'
                          : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`p-2 rounded ${
                        viewMode === 'table'
                          ? 'bg-white dark:bg-gray-600 shadow'
                          : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expandable Filters */}
              {showFilters && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-6">
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
                      </div>
                    </div>
                  </div>

                  {/* Position Types */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Position Types
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['PT', 'YT', 'LP'].map((type) => {
                        const isSelected = positionTypes.includes(type);
                        return (
                          <button
                            key={type}
                            onClick={() => {
                              if (isSelected) {
                                setPositionTypes(positionTypes.filter(t => t !== type));
                              } else {
                                setPositionTypes([...positionTypes, type]);
                              }
                            }}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                              isSelected
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            {type}
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
                        setPositionTypes(['PT', 'YT', 'LP']);
                      }}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                    >
                      Reset all filters
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Positions Display */}
            {isLoading && (
              <PositionCardSkeletonGrid count={6} />
            )}

            {error && (
              <ErrorState
                title="Failed to Load Positions"
                message={error}
              />
            )}

            {!isLoading && !error && filteredPositions.length === 0 && (
              <div className="glass rounded-xl p-12 text-center shadow-lg">
                {positions.length === 0 ? (
                  <>
                    {/* No positions at all */}
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center">
                      <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                      Start Your DeFi Journey
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                      You don't have any active Pendle positions yet. Discover high-yield opportunities and start earning today.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <a
                        href="/opportunities"
                        className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Discover Opportunities
                      </a>
                      <a
                        href="/opportunities"
                        className="inline-flex items-center justify-center px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-semibold transition-colors"
                      >
                        Learn More
                      </a>
                    </div>
                    <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="text-2xl mb-2">🎯</div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">High Yields</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Earn competitive APY on your assets</p>
                      </div>
                      <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="text-2xl mb-2">🛡️</div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Risk Control</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Manage risk with PT/YT splits</p>
                      </div>
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="text-2xl mb-2">⚡</div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Easy to Use</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Smart recommendations for you</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Has positions but none match filters */}
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      No positions match your filters
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Try adjusting your filters to see more positions
                    </p>
                    <button
                      onClick={() => {
                        setMinAPY(0);
                        setMaxAPY(100);
                        setPositionTypes(['PT', 'YT', 'LP']);
                        setFilterStatus('all');
                      }}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Reset All Filters
                    </button>
                  </>
                )}
              </div>
            )}

            {!isLoading && !error && filteredPositions.length > 0 && (
              <>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredPositions.map((position, index) => (
                      <EnhancedPositionCard
                        key={index}
                        position={position}
                        onManage={handleManagePosition}
                        onRedeemSuccess={() => {
                          // Reload positions after successful redeem
                          loadPositions();
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <PositionsTable
                    positions={filteredPositions}
                  />
                )}

                {/* Bulk Actions */}
                {filteredPositions.length > 0 && (
                  <div className="mt-8">
                    <ExitToUSDC
                      positions={filteredPositions}
                      onExit={handleExitToUSDC}
                    />
                  </div>
                )}
              </>
            )}

            {/* Performance Tracking */}
            {!isLoading && positions.length > 0 && connectedAddress && (
              <div className="mt-8">
                <PerformanceTracking address={connectedAddress} currentValue={metrics.totalValue} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
