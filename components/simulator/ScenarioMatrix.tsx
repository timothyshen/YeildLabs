'use client';

import { useMemo } from 'react';
import type { SimulatorInput } from '@/types';
import { generateScenarioMatrix } from '@/lib/utils/simulator';

interface ScenarioMatrixProps {
  input: SimulatorInput;
}

export function ScenarioMatrix({ input }: ScenarioMatrixProps) {
  const scenarios = useMemo(() => generateScenarioMatrix(input), [input]);

  // Get unique APY changes and time points
  const apyChanges = useMemo(
    () => [...new Set(scenarios.map((s) => s.apyChange))].sort((a, b) => a - b),
    [scenarios]
  );

  const timePoints = useMemo(
    () => [...new Set(scenarios.map((s) => s.timePoint))].sort((a, b) => a - b),
    [scenarios]
  );

  // Get color based on profit/loss percentage
  const getColor = (profitLossPercent: number) => {
    if (profitLossPercent > 15) return 'bg-green-500 text-white';
    if (profitLossPercent > 5) return 'bg-green-400 text-white';
    if (profitLossPercent > 0) return 'bg-green-300 text-gray-900';
    if (profitLossPercent > -5) return 'bg-orange-300 text-gray-900';
    if (profitLossPercent > -10) return 'bg-orange-400 text-white';
    return 'bg-red-500 text-white';
  };

  // Find scenario for specific APY change and time point
  const getScenario = (apyChange: number, timePoint: number) => {
    return scenarios.find(
      (s) => Math.abs(s.apyChange - apyChange) < 0.01 && s.timePoint === timePoint
    );
  };

  return (
    <div className="glass rounded-xl p-6 shadow-lg">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        APY Scenario Analysis
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        How different APY changes affect your returns over time
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="p-2 text-left text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600">
                APY Change
              </th>
              {timePoints.map((tp) => (
                <th
                  key={tp}
                  className="p-2 text-center text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-600"
                >
                  Day {tp}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {apyChanges.map((apyChange) => (
              <tr key={apyChange}>
                <td className="p-2 font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700">
                  {apyChange > 0 ? '+' : ''}
                  {apyChange.toFixed(1)}%
                </td>
                {timePoints.map((tp) => {
                  const scenario = getScenario(apyChange, tp);
                  if (!scenario) return <td key={tp} className="p-2">-</td>;

                  return (
                    <td
                      key={tp}
                      className={`p-2 text-center border-b border-gray-200 dark:border-gray-700 ${getColor(
                        scenario.profitLossPercent
                      )}`}
                    >
                      <div className="font-semibold">
                        {scenario.profitLossPercent > 0 ? '+' : ''}
                        {scenario.profitLossPercent.toFixed(1)}%
                      </div>
                      <div className="text-xs opacity-80">
                        ${scenario.value.toFixed(0)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-green-500 rounded"></div>
          <span className="text-xs text-gray-600 dark:text-gray-400">Strong Profit (&gt;15%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-green-400 rounded"></div>
          <span className="text-xs text-gray-600 dark:text-gray-400">Good Profit (5-15%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-green-300 rounded"></div>
          <span className="text-xs text-gray-600 dark:text-gray-400">Small Profit (0-5%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-orange-300 rounded"></div>
          <span className="text-xs text-gray-600 dark:text-gray-400">Small Loss (0-5%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-orange-400 rounded"></div>
          <span className="text-xs text-gray-600 dark:text-gray-400">Moderate Loss (5-10%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-red-500 rounded"></div>
          <span className="text-xs text-gray-600 dark:text-gray-400">Heavy Loss (&gt;10%)</span>
        </div>
      </div>

      <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
        <p className="text-xs text-purple-800 dark:text-purple-200">
          <strong>💡 How to use this matrix:</strong> {' '}
          Each cell shows your profit/loss % if APY changes by the row amount at the column timepoint.
          {input.type === 'PT' && ' PT is less sensitive to APY changes - notice the stable returns.'}
          {input.type === 'YT' && ' YT is highly sensitive to APY changes - notice the wide range of outcomes.'}
          {input.type === 'BOTH' && ' Combined PT/YT exposure balances risk and reward.'}
        </p>
      </div>
    </div>
  );
}
