'use client';

interface YieldMetrics {
  dailyYield: number;
  weeklyYield: number;
  monthlyYield: number;
  projectedAnnual: number;
  weightedAPY: number;
}

interface YieldSummaryCardProps {
  metrics: YieldMetrics;
}

export function YieldSummaryCard({ metrics }: YieldSummaryCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold opacity-90">Yield Summary</h3>
        <div className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
          {formatPercentage(metrics.weightedAPY)} APY
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm opacity-80 mb-1">Daily Yield</p>
          <p className="text-2xl font-bold">{formatCurrency(metrics.dailyYield)}</p>
        </div>
        <div>
          <p className="text-sm opacity-80 mb-1">Weekly Yield</p>
          <p className="text-2xl font-bold">{formatCurrency(metrics.weeklyYield)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
        <div>
          <p className="text-sm opacity-80 mb-1">Monthly Yield</p>
          <p className="text-xl font-bold">{formatCurrency(metrics.monthlyYield)}</p>
        </div>
        <div>
          <p className="text-sm opacity-80 mb-1">Projected Annual</p>
          <p className="text-xl font-bold">{formatCurrency(metrics.projectedAnnual)}</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/20">
        <p className="text-xs opacity-75">
          Based on current positions and weighted average APY
        </p>
      </div>
    </div>
  );
}
