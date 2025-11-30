'use client';

import React, { memo } from 'react';
import type { WalletAsset } from '@/types';
import {
  getTokenAddress,
  getTokenSymbol,
  getBalance,
} from '@/lib/utils/typeHelpers';

interface AssetTableProps {
  assets: WalletAsset[];
}

// Memoized row component
const AssetRow = memo(function AssetRow({
  asset,
  formatBalance,
  formatValue,
}: {
  asset: WalletAsset;
  formatBalance: (balance: number, decimals?: number) => string;
  formatValue: (value: number) => string;
}) {
  const tokenAddress = getTokenAddress(asset);
  const symbol = getTokenSymbol(asset) || 'TOKEN';
  const balance = getBalance(asset);

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm mr-3">
            {symbol[0]}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {symbol}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {tokenAddress.slice(0, 6)}...{tokenAddress.slice(-4)}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white font-mono">
        {formatBalance(balance)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900 dark:text-white">
        {formatValue(asset.valueUSD)}
      </td>
    </tr>
  );
});

export const AssetTable = memo(function AssetTable({ assets }: AssetTableProps) {
  const formatValue = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatBalance = (balance: number, decimals = 4) => {
    return balance.toFixed(decimals);
  };

  if (assets.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">No assets found</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Wallet Assets
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Asset
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Balance
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Value (USD)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {assets.map((asset, index) => {
              const key = getTokenAddress(asset) || `asset-${index}`;
              return (
                <AssetRow
                  key={key}
                  asset={asset}
                  formatBalance={formatBalance}
                  formatValue={formatValue}
                />
              );
            })}
          </tbody>
          <tfoot className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                Total
              </td>
              <td></td>
              <td className="px-6 py-4 text-right text-sm font-bold text-gray-900 dark:text-white">
                {formatValue(assets.reduce((sum, asset) => sum + asset.valueUSD, 0))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
});
