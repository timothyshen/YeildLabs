'use client';

import type { OctavPortfolio } from '@/types/octav';

interface ProtocolBreakdownProps {
  portfolio: OctavPortfolio;
}

export function ProtocolBreakdown({ portfolio }: ProtocolBreakdownProps) {
  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num || 0);
  };

  if (!portfolio.assetByProtocols || Object.keys(portfolio.assetByProtocols).length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Protocol Breakdown
        </h3>
        <p className="text-gray-500 dark:text-gray-400">No protocol data available</p>
      </div>
    );
  }

  const protocols = Object.values(portfolio.assetByProtocols)
    .filter(protocol => parseFloat(protocol.value || '0') > 0)
    .sort((a, b) => parseFloat(b.value || '0') - parseFloat(a.value || '0'));

  const totalValue = parseFloat(portfolio.networth || '0');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
        Protocol Breakdown
      </h3>

      <div className="space-y-4">
        {protocols.map((protocol) => {
          const value = parseFloat(protocol.value || '0');
          const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;

          return (
            <div key={protocol.key} className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {protocol.name}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              </div>
              <div className="ml-4 text-right">
                <p className="font-bold text-gray-900 dark:text-white">
                  {formatCurrency(value)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {protocol.assets?.length || 0} asset{protocol.assets?.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

