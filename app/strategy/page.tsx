'use client';

import { useState } from 'react';
import type { SimulatorInput, SimulatorOutput } from '@/types';
import { runSimulation } from '@/lib/utils/simulator';
import { SimulationResults } from '@/components/simulator/SimulationResults';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

const DURATION_PRESETS = [30, 60, 90, 180];
const APY_PRESETS = [10, 15, 20, 25, 30];

export default function SimulatorPage() {
  const [input, setInput] = useState<SimulatorInput>({
    amount: 10000,
    asset: 'USDC',
    type: 'PT',
    duration: 90,
    expectedAPY: 15,
  });

  const [output, setOutput] = useState<SimulatorOutput | null>(null);
  const [hasSimulated, setHasSimulated] = useState(false);

  const handleSimulate = () => {
    const result = runSimulation(input);
    setOutput(result);
    setHasSimulated(true);
  };

  const handleReset = () => {
    setInput({
      amount: 10000,
      asset: 'USDC',
      type: 'PT',
      duration: 90,
      expectedAPY: 15,
    });
    setOutput(null);
    setHasSimulated(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Yield Simulator"
          subtitle="Project your potential returns with different Pendle strategies"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="space-y-6">
            <div className="glass rounded-xl p-6 shadow-lg">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Simulation Parameters
              </h2>

              {/* Amount */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Investment Amount (USD)
                </label>
                <input
                  type="number"
                  value={input.amount}
                  onChange={(e) => setInput({ ...input, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  step="1000"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Enter the amount you want to invest
                </p>
              </div>

              {/* Asset */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Asset
                </label>
                <select
                  value={input.asset}
                  onChange={(e) => setInput({ ...input, asset: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="USDC">USDC</option>
                  <option value="sUSDe">sUSDe</option>
                  <option value="USD0++">USD0++</option>
                  <option value="fUSD">fUSD</option>
                  <option value="cUSD">cUSD</option>
                </select>
              </div>

              {/* Token Type */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Token Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setInput({ ...input, type: 'PT' })}
                    className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                      input.type === 'PT'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    PT (Principal)
                  </button>
                  <button
                    onClick={() => setInput({ ...input, type: 'YT' })}
                    className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                      input.type === 'YT'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    YT (Yield)
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {input.type === 'PT'
                    ? 'PT locks in fixed yield until maturity'
                    : 'YT value depends on APY changes over time'
                  }
                </p>
              </div>

              {/* Duration */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Duration (Days)
                </label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {DURATION_PRESETS.map((days) => (
                    <button
                      key={days}
                      onClick={() => setInput({ ...input, duration: days })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        input.duration === days
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min="30"
                  max="365"
                  value={input.duration}
                  onChange={(e) => setInput({ ...input, duration: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>30 days</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{input.duration} days</span>
                  <span>365 days</span>
                </div>
              </div>

              {/* Expected APY */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Expected APY (%)
                </label>
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {APY_PRESETS.map((apy) => (
                    <button
                      key={apy}
                      onClick={() => setInput({ ...input, expectedAPY: apy })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        input.expectedAPY === apy
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {apy}%
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  step="0.1"
                  value={input.expectedAPY}
                  onChange={(e) => setInput({ ...input, expectedAPY: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>1%</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{input.expectedAPY.toFixed(1)}%</span>
                  <span>50%</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleSimulate}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Run Simulation
                </button>
                {hasSimulated && (
                  <button
                    onClick={handleReset}
                    className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Info Cards */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
              <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-3">
                ℹ️ About the Simulator
              </h3>
              <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                <p>
                  <strong>PT (Principal Token):</strong> Receives a fixed discount at purchase.
                  Value at maturity is guaranteed regardless of APY changes.
                </p>
                <p>
                  <strong>YT (Yield Token):</strong> Captures all yield during the period.
                  Value is highly sensitive to APY fluctuations.
                </p>
                <p className="text-xs opacity-75 mt-3">
                  Note: This is a simplified model for educational purposes. Actual results may vary.
                </p>
              </div>
            </div>
          </div>

          {/* Results */}
          <div>
            {output && hasSimulated ? (
              <SimulationResults input={input} output={output} />
            ) : (
              <EmptyState
                icon="📊"
                title="Ready to Simulate"
                description="Configure your parameters on the left and click 'Run Simulation' to see projected results"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
