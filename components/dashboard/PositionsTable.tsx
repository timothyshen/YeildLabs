'use client';

import React, { useCallback } from 'react';
import type { UserPosition } from '@/types';

interface PositionsTableProps {
  positions: UserPosition[];
}

export const PositionsTable = React.memo(function PositionsTable({ positions }: PositionsTableProps) {
  const formatValue = useCallback((value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  }, []);

  const formatPnL = useCallback((pnl: number) => {
    const color = pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    const sign = pnl >= 0 ? '+' : '';
    return (
      <span className={color}>
        {sign}{formatValue(pnl)}
      </span>
    );
  }, [formatValue]);

  if (positions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">No Pendle positions found</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Pendle Positions
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Pool
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                PT Balance
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                YT Balance
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Current Value
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Maturity Value
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Unrealized PnL
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {positions.map((position, index) => {
              const poolId = (position as any).poolAddress || (position.pool as any)?.address || `pool-${index}`;
              const poolName = (position.pool as any)?.name || position.pool;
              return (
              <tr
                key={poolId}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-xs mr-3">
                      PT
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {poolName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Pendle Position
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  {position.ptBalance > 0 ? (
                    <span className="text-sm font-mono text-gray-900 dark:text-white">
                      {Number(position.ptBalance || 0).toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  {position.ytBalance > 0 ? (
                    <span className="text-sm font-mono text-gray-900 dark:text-white">
                      {Number(position.ytBalance || 0).toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900 dark:text-white">
                  {formatValue(position.currentValue)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                  {formatValue(position.maturityValue)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold">
                  {formatPnL(position.unrealizedPnL)}
                </td>
              </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white" colSpan={3}>
                Total Positions
              </td>
              <td className="px-6 py-4 text-right text-sm font-bold text-gray-900 dark:text-white">
                {formatValue(positions.reduce((sum, p) => sum + p.currentValue, 0))}
              </td>
              <td className="px-6 py-4 text-right text-sm font-bold text-gray-900 dark:text-white">
                {formatValue(positions.reduce((sum, p) => sum + p.maturityValue, 0))}
              </td>
              <td className="px-6 py-4 text-right text-sm font-bold">
                {formatPnL(positions.reduce((sum, p) => sum + p.unrealizedPnL, 0))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
});
