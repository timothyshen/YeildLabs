'use client';

import { useMemo } from 'react';
import { useAccount } from 'wagmi';
import { ConnectKitButton } from 'connectkit';
import { useMultiWallet } from '@/lib/hooks/useMultiWallet';
import { WalletList } from '@/components/wallet/WalletList';
import { AddWalletButton } from '@/components/wallet/AddWalletButton';
import { AssetTable } from '@/components/dashboard/AssetTable';
import { PositionsTable } from '@/components/dashboard/PositionsTable';
import { YieldSummaryCard } from '@/components/dashboard/YieldSummaryCard';
import { PortfolioAllocation } from '@/components/dashboard/PortfolioAllocation';
import { PerformanceChart } from '@/components/dashboard/PerformanceChart';
import { ExitToUSDC } from '@/components/dashboard/ExitToUSDC';
import { EnhancedPositionCard } from '@/components/dashboard/EnhancedPositionCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { PortfolioSummary } from '@/components/dashboard/PortfolioSummary';
import { ProtocolBreakdown } from '@/components/dashboard/ProtocolBreakdown';
import { ChainDistribution } from '@/components/dashboard/ChainDistribution';
import { PerformanceTracking } from '@/components/dashboard/PerformanceTracking';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  calculateYieldMetrics,
  calculateAllocations,
  generateMockPerformanceData,
} from '@/lib/utils/dashboardCalculations';
import Link from 'next/link';

export default function DashboardPage() {
  const { isConnected } = useAccount();
  const {
    wallets,
    activeWallet,
    totalValueAllWallets,
    isLoading,
    addWallet,
    removeWallet,
    setActiveWallet,
    updateWalletLabel,
    refreshWallet,
    refreshAllWallets,
  } = useMultiWallet();

  // Calculate metrics for active wallet
  const yieldMetrics = useMemo(() => {
    if (!activeWallet) {
      return {
        dailyYield: 0,
        weeklyYield: 0,
        monthlyYield: 0,
        projectedAnnual: 0,
        weightedAPY: 0,
      };
    }
    return calculateYieldMetrics(activeWallet.positions, activeWallet.totalValueUSD);
  }, [activeWallet]);

  const allocations = useMemo(() => {
    if (!activeWallet) return [];
    return calculateAllocations(activeWallet.assets, activeWallet.positions);
  }, [activeWallet]);

  const performanceData = useMemo(() => {
    if (!activeWallet) return [];
    return generateMockPerformanceData(activeWallet.totalValueUSD);
  }, [activeWallet]);

  const handleQuickAction = (action: string) => {
    console.log('Quick action:', action);
    // TODO: Implement quick actions
  };

  const handleExitToUSDC = async (pools: string[]) => {
    console.log('Exiting positions:', pools);
    // TODO: Implement exit functionality
  };

  const handleManagePosition = (pool: string, action: 'roll' | 'exit' | 'add') => {
    console.log('Managing position:', pool, action);
    // TODO: Implement position management
  };

  const formatValue = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Multi-Wallet Dashboard"
          subtitle="Manage and track your Pendle yield positions across multiple wallets"
        />

        {!isConnected ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700">
            <div className="text-6xl mb-4">👛</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Connect Your Wallet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Connect your wallet to view your assets and Pendle positions
            </p>
            <div className="flex justify-center">
              <ConnectKitButton />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Sidebar - Wallets */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    My Wallets
                  </h2>
                  <button
                    onClick={refreshAllWallets}
                    disabled={isLoading}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
                    title="Refresh all wallets"
                  >
                    🔄
                  </button>
                </div>

                {/* Total Value Card */}
                <StatCard
                  title="Total Portfolio Value"
                  value={totalValueAllWallets}
                  subtitle={`Across ${wallets.length} wallet${wallets.length !== 1 ? 's' : ''}`}
                  gradient="blue"
                  className="mb-6"
                />

                <AddWalletButton
                  onAddWallet={addWallet}
                  isLoading={isLoading}
                  existingAddresses={wallets.map(w => w.address)}
                />
              </div>

              <WalletList
                wallets={wallets}
                activeWallet={activeWallet}
                onSelectWallet={setActiveWallet}
                onRemoveWallet={removeWallet}
                onUpdateLabel={updateWalletLabel}
                onRefresh={refreshWallet}
              />
            </div>

            {/* Main Content - Enhanced Dashboard */}
            <div className="lg:col-span-2 space-y-6">
              {activeWallet ? (
                <>
                  {/* Active Wallet Header */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                          {activeWallet.label || 'Active Wallet'}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-mono mt-1">
                          {activeWallet.address}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Value</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">
                          {formatValue(activeWallet.totalValueUSD)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Assets</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {activeWallet.assets.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Positions</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {activeWallet.positions.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total PnL</p>
                        <p className={`text-lg font-bold ${
                          activeWallet.positions.reduce((sum, p) => sum + p.unrealizedPnL, 0) >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {formatValue(activeWallet.positions.reduce((sum, p) => sum + p.unrealizedPnL, 0))}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">APY</p>
                        <p className="text-lg font-bold text-green-600">
                          {yieldMetrics.weightedAPY.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Portfolio Summary from Octav */}
                  {activeWallet.portfolio && (
                    <PortfolioSummary portfolio={activeWallet.portfolio} />
                  )}

                  {/* Top Row: Yield Summary and Performance Chart */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <YieldSummaryCard metrics={yieldMetrics} />
                    <QuickActions onAction={handleQuickAction} />
                  </div>

                  {/* Performance Tracking with Historical Data */}
                  {activeWallet.portfolio ? (
                    <PerformanceTracking
                      address={activeWallet.address}
                      currentValue={activeWallet.totalValueUSD}
                    />
                  ) : (
                    <PerformanceChart data={performanceData} />
                  )}

                  {/* Protocol and Chain Breakdown */}
                  {activeWallet.portfolio && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      <ProtocolBreakdown portfolio={activeWallet.portfolio} />
                      <ChainDistribution portfolio={activeWallet.portfolio} />
                    </div>
                  )}

                  {/* Portfolio Allocation and Assets */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <PortfolioAllocation
                      allocations={allocations}
                      totalValue={activeWallet.totalValueUSD}
                    />
                    <AssetTable assets={activeWallet.assets} />
                  </div>

                  {/* Enhanced Positions */}
                  {activeWallet.positions.length > 0 && (
                    <>
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          Your Positions
                        </h3>
                        <Link
                          href="/scanner"
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                          Find More Opportunities →
                        </Link>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        {activeWallet.positions.map((position) => (
                          <EnhancedPositionCard
                            key={position.pool}
                            position={position}
                            onManage={handleManagePosition}
                          />
                        ))}
                      </div>

                      {/* Exit to USDC */}
                      <ExitToUSDC
                        positions={activeWallet.positions}
                        onExit={handleExitToUSDC}
                      />
                    </>
                  )}

                  {/* Legacy Tables (Optional - can be removed if enhanced cards are preferred) */}
                  {activeWallet.positions.length === 0 && (
                    <EmptyState
                      icon="📊"
                      title="No Positions Yet"
                      description="Start earning yield by exploring available pools in the scanner"
                      action={{
                        label: 'Browse Yield Opportunities',
                        onClick: () => window.location.href = '/scanner',
                        variant: 'primary',
                      }}
                    />
                  )}
                </>
              ) : (
                <EmptyState
                  icon="👛"
                  title="Select a Wallet"
                  description={
                    wallets.length === 0
                      ? 'Add a wallet to view assets and positions'
                      : 'Select a wallet from the list to view details'
                  }
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
