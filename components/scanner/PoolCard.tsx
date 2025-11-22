'use client';

import type { PendlePool } from '@/types';

interface PoolCardProps {
  pool: PendlePool;
  onSelect?: (pool: PendlePool) => void;
}

export function PoolCard({ pool, onSelect }: PoolCardProps) {
  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const formatTVL = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  };

  const getStrategyColor = (tag: string) => {
    switch (tag) {
      case 'Best PT':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Best YT':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'Risky':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const discount = pool.ptDiscount * 100;

  return (
    <div
      onClick={() => onSelect?.(pool)}
      className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer hover:shadow-lg"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            {pool.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {pool.underlyingAsset} Pool
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStrategyColor(pool.strategyTag)}`}>
          {pool.strategyTag}
        </span>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current APY</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatPercent(pool.apy)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Implied Yield</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatPercent(pool.impliedYield)}
          </p>
        </div>
      </div>

      {/* Additional Info */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <span className="text-gray-600 dark:text-gray-400">PT Price</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            ${pool.ptPrice.toFixed(3)}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <span className="text-gray-600 dark:text-gray-400">YT Price</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            ${pool.ytPrice.toFixed(3)}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <span className="text-gray-600 dark:text-gray-400">PT Discount</span>
          <span className="font-semibold text-orange-600 dark:text-orange-400">
            {formatPercent(discount)}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <span className="text-gray-600 dark:text-gray-400">TVL</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {formatTVL(pool.tvl)}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">{pool.daysToMaturity}</span> days to maturity
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
          View Details →
        </button>
      </div>
    </div>
  );
}
