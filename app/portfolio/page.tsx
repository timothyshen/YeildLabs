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
        setPositions(data.data || []);
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
    const totalValue = positions.reduce((sum, p) => sum + (p.totalValueUSD || 0), 0);
    const totalPnL = positions.reduce((sum, p) => sum + (p.pnl || 0), 0);
    const avgAPY = positions.length > 0
      ? positions.reduce((sum, p) => sum + (p.apy || 0), 0) / positions.length
      : 0;

    const maturingSoon = positions.filter(p => {
      if (p.maturity) {
        const daysUntilMaturity = Math.floor((p.maturity * 1000 - Date.now()) / (1000 * 60 * 60 * 24));
        return daysUntilMaturity <= 30 && daysUntilMaturity > 0;
      }
      return false;
    }).length;

    return { totalValue, totalPnL, avgAPY, maturingSoon };
  }, [positions]);

  // Filter and sort positions
  const filteredPositions = useMemo(() => {
    let filtered = [...positions];

    // Apply status filter
    if (filterStatus === 'active') {
      filtered = filtered.filter(p => p.status === 'active');
    } else if (filterStatus === 'maturing-soon') {
      filtered = filtered.filter(p => {
        if (p.maturity) {
          const daysUntilMaturity = Math.floor((p.maturity * 1000 - Date.now()) / (1000 * 60 * 60 * 24));
          return daysUntilMaturity <= 30 && daysUntilMaturity > 0;
        }
        return false;
      });
    } else if (filterStatus === 'high-yield') {
      filtered = filtered.filter(p => (p.apy || 0) >= 15);
    }

    // Apply APY filter
    filtered = filtered.filter(p => {
      const apy = p.apy || 0;
      return apy >= minAPY && apy <= maxAPY;
    });

    // Apply position type filter
    filtered = filtered.filter(p => positionTypes.includes(p.type || 'PT'));

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'value':
          return (b.totalValueUSD || 0) - (a.totalValueUSD || 0);
        case 'apy':
          return (b.apy || 0) - (a.apy || 0);
        case 'maturity':
          return (a.maturity || 0) - (b.maturity || 0);
        case 'pnl':
          return (b.pnl || 0) - (a.pnl || 0);
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
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center shadow-md">
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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md mb-6 p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                {/* Left side - Filters */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
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
            {isLoading && <LoadingState message="Loading your positions..." />}

            {error && (
              <ErrorState
                title="Failed to Load Positions"
                message={error}
              />
            )}

            {!isLoading && !error && filteredPositions.length === 0 && (
              <EmptyState
                title="No positions found"
                message="You don't have any active Pendle positions matching your filters"
              />
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
                      />
                    ))}
                  </div>
                ) : (
                  <PositionsTable
                    positions={filteredPositions}
                    onManage={handleManagePosition}
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
            {!isLoading && positions.length > 0 && (
              <div className="mt-8">
                <PerformanceTracking positions={positions} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
