'use client';

import type { SimulatorOutput, SimulatorInput } from '@/types';
import { calculateRiskScore, getRiskLevel } from '@/lib/utils/simulator';

interface SimulationResultsProps {
  input: SimulatorInput;
  output: SimulatorOutput;
}

export function SimulationResults({ input, output }: SimulationResultsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const profit = output.futureValue - input.amount;
  const profitPercentage = ((profit / input.amount) * 100).toFixed(2);
  const isProfit = profit >= 0;

  const riskScore = calculateRiskScore(input);
  const riskLevel = getRiskLevel(riskScore);

  const getRiskColor = (color: string) => {
    switch (color) {
      case 'red':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
      case 'green':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Results Card */}
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-8 text-white">
        <h3 className="text-lg opacity-90 mb-2">Estimated Future Value</h3>
        <p className="text-4xl font-bold mb-4">
          {formatCurrency(output.futureValue)}
        </p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="opacity-75 mb-1">Initial Investment</p>
            <p className="text-xl font-semibold">{formatCurrency(input.amount)}</p>
          </div>
          <div>
            <p className="opacity-75 mb-1">Profit/Loss</p>
            <p className={`text-xl font-semibold ${isProfit ? 'text-green-200' : 'text-red-200'}`}>
              {isProfit ? '+' : ''}{formatCurrency(profit)}
              <span className="text-sm ml-2">({profitPercentage}%)</span>
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* APY Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm text-gray-600 dark:text-gray-400 mb-2">Annualized Yield</h4>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {output.apy.toFixed(2)}%
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Expected annual return rate
          </p>
        </div>

        {/* Duration Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm text-gray-600 dark:text-gray-400 mb-2">Investment Period</h4>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {input.duration} days
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Time until maturity
          </p>
        </div>
      </div>

      {/* Risk Analysis */}
      <div className={`rounded-xl p-6 border-2 ${getRiskColor(riskLevel.color)}`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h4 className="text-lg font-bold mb-1">{riskLevel.label}</h4>
            <p className="text-sm opacity-90">{riskLevel.description}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{riskScore}</p>
            <p className="text-xs opacity-75">Risk Score</p>
          </div>
        </div>

        <div className="space-y-2">
          <h5 className="font-semibold text-sm mb-2">Risk Factors:</h5>
          {output.risks.map((risk, index) => (
            <div key={index} className="flex items-start gap-2 text-sm">
              <span className="opacity-50">•</span>
              <span>{risk}</span>
            </div>
          ))}
        </div>
      </div>

      {/* APY Sensitivity Chart (YT only) */}
      {input.type === 'YT' && output.sensitivityCurve && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            APY Sensitivity Analysis
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Shows how your investment value changes with different APY scenarios
          </p>

          <div className="space-y-2">
            {output.sensitivityCurve.map((point, index) => {
              const isCurrentAPY = Math.abs(point.apy - input.expectedAPY) < 1;
              const profit = point.value - input.amount;
              const isProfit = profit >= 0;

              return (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    isCurrentAPY
                      ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500'
                      : 'bg-gray-50 dark:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-24">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {point.apy.toFixed(1)}% APY
                      </p>
                      {isCurrentAPY && (
                        <p className="text-xs text-blue-600 dark:text-blue-400">Expected</p>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${isProfit ? 'bg-green-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min((point.value / (input.amount * 2)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(point.value)}
                    </p>
                    <p className={`text-xs ${isProfit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {isProfit ? '+' : ''}{formatCurrency(profit)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Strategy Recommendation */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-2">
          💡 Strategy Recommendation
        </h4>
        <p className="text-sm text-blue-800 dark:text-blue-200">
          {input.type === 'PT' ? (
            <>
              <strong>PT Strategy:</strong> Best for users seeking stable, predictable returns.
              Your yield is locked in regardless of APY changes. Consider this if you believe
              current yields are attractive and want to lock them in.
            </>
          ) : (
            <>
              <strong>YT Strategy:</strong> Best for users who expect APY to increase.
              Your returns are highly sensitive to APY changes. Only consider this if you have
              strong conviction that yields will rise significantly.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
