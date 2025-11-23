'use client';

import React from 'react';
import { Progress } from '@/components/ui/progress';
import type { PendlePool } from '@/types';

interface StrategyHeaderProps {
  pool: PendlePool;
  score: number;
  riskLevel: 'conservative' | 'moderate' | 'aggressive' | 'neutral';
  ptRatio: number;
  ytRatio: number;
}

export const StrategyHeader = React.memo(function StrategyHeader({
  pool,
  score,
  riskLevel,
  ptRatio,
  ytRatio,
}: StrategyHeaderProps) {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'conservative':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'moderate':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'aggressive':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300';
    }
  };

  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-green-600';
    if (s >= 60) return 'text-blue-600';
    if (s >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4">
      {/* Pool Name and Score */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {pool.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {typeof pool.underlyingAsset === 'string'
              ? pool.underlyingAsset
              : (pool.underlyingAsset as any)?.symbol || 'Unknown Asset'}
          </p>
        </div>
        <div className="text-right">
          <div className={`text-4xl font-bold ${getScoreColor(score)}`}>
            {score}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Strategy Score</p>
        </div>
      </div>

      {/* Score Progress Bar */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Opportunity Rating
          </span>
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {score}/100
          </span>
        </div>
        <Progress value={score} className="h-2" />
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* APY */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
            APY
          </p>
          <p className="text-lg font-bold text-green-900 dark:text-green-100">
            {(pool.apy / 100).toFixed(2)}%
          </p>
        </div>

        {/* Maturity */}
        <div className="bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
            Maturity
          </p>
          <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
            {pool.daysToMaturity}d
          </p>
        </div>

        {/* Risk Level */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
          <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">
            Risk
          </p>
          <p className="text-sm font-bold text-purple-900 dark:text-purple-100 capitalize">
            {riskLevel}
          </p>
        </div>
      </div>

      {/* PT/YT Allocation */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Recommended Allocation
        </p>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                PT {ptRatio}%
              </span>
              <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                YT {ytRatio}%
              </span>
            </div>
            <div className="relative h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center"
                style={{ width: `${ptRatio}%` }}
              >
                {ptRatio > 15 && (
                  <span className="text-xs font-semibold text-white">PT</span>
                )}
              </div>
              <div
                className="absolute top-0 right-0 h-full bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center"
                style={{ width: `${ytRatio}%` }}
              >
                {ytRatio > 15 && (
                  <span className="text-xs font-semibold text-white">YT</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
