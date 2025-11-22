'use client';

interface AllocationItem {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

interface PortfolioAllocationProps {
  allocations: AllocationItem[];
  totalValue: number;
}

export function PortfolioAllocation({ allocations, totalValue }: PortfolioAllocationProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
        Portfolio Allocation
      </h3>

      {/* Bar Chart */}
      <div className="mb-6">
        <div className="flex h-8 rounded-lg overflow-hidden">
          {allocations.map((item, index) => (
            <div
              key={index}
              className={`${item.color} transition-all hover:opacity-80`}
              style={{ width: `${item.percentage}%` }}
              title={`${item.label}: ${item.percentage.toFixed(1)}%`}
            />
          ))}
        </div>
      </div>

      {/* Allocation List */}
      <div className="space-y-3">
        {allocations.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded ${item.color}`} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {item.label}
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {formatCurrency(item.value)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {item.percentage.toFixed(1)}%
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Total Portfolio
          </span>
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {formatCurrency(totalValue)}
          </span>
        </div>
      </div>
    </div>
  );
}
