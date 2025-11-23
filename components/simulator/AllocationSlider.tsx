'use client';

import { useState, useEffect } from 'react';
import type { SimulatorInput } from '@/types';
import { runSimulation, calculateRiskScore } from '@/lib/utils/simulator';

interface AllocationSliderProps {
  input: SimulatorInput;
  recommendedPtPercentage: number;
  onAllocationChange?: (ptPercentage: number, ytPercentage: number) => void;
}

export function AllocationSlider({
  input,
  recommendedPtPercentage,
  onAllocationChange,
}: AllocationSliderProps) {
  const [ptPercentage, setPtPercentage] = useState(recommendedPtPercentage);
  const ytPercentage = 100 - ptPercentage;

  useEffect(() => {
    setPtPercentage(recommendedPtPercentage);
  }, [recommendedPtPercentage]);

  useEffect(() => {
    onAllocationChange?.(ptPercentage, ytPercentage);
  }, [ptPercentage, ytPercentage, onAllocationChange]);

  // Calculate metrics for current allocation
  const ptAmount = (input.amount * ptPercentage) / 100;
  const ytAmount = (input.amount * ytPercentage) / 100;

  const ptResult = ptAmount > 0 ? runSimulation({ ...input, type: 'PT', amount: ptAmount }) : null;
  const ytResult = ytAmount > 0 ? runSimulation({ ...input, type: 'YT', amount: ytAmount }) : null;

  const totalValue = (ptResult?.futureValue || 0) + (ytResult?.futureValue || 0);
  const totalYield = totalValue - input.amount;
  const totalReturn = (totalYield / input.amount) * 100;

  // Calculate blended risk score
  const ptRisk = ptAmount > 0 ? calculateRiskScore({ ...input, type: 'PT' }) : 0;
  const ytRisk = ytAmount > 0 ? calculateRiskScore({ ...input, type: 'YT' }) : 0;
  const blendedRisk = Math.round(
    (ptRisk * ptPercentage + ytRisk * ytPercentage) / 100
  );

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPtPercentage(parseInt(e.target.value));
  };

  const getRiskColor = (risk: number) => {
    if (risk >= 70) return 'text-red-600 dark:text-red-400';
    if (risk >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-green-600 dark:text-green-400';
  };

  const isOptimal = Math.abs(ptPercentage - recommendedPtPercentage) <= 5;

  return (
    <div className="glass rounded-xl p-6 shadow-lg">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Interactive Allocation Builder
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Adjust the PT/YT split to see how it affects returns and risk
      </p>

      {/* Slider */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
            PT: {ptPercentage}%
          </span>
          <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
            YT: {ytPercentage}%
          </span>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          value={ptPercentage}
          onChange={handleSliderChange}
          className="w-full h-3 bg-gradient-to-r from-blue-500 via-purple-400 to-purple-500 rounded-lg appearance-none cursor-pointer slider-thumb"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${ptPercentage}%, #a855f7 ${ptPercentage}%, #a855f7 100%)`,
          }}
        />

        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
          <span>All PT (Low Risk)</span>
          <span>All YT (High Risk)</span>
        </div>
      </div>

      {/* Visual Allocation Bar */}
      <div className="relative h-12 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden mb-6">
        <div
          className="absolute top-0 left-0 h-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold transition-all duration-300"
          style={{ width: `${ptPercentage}%` }}
        >
          {ptPercentage > 10 && `${ptPercentage}% PT`}
        </div>
        <div
          className="absolute top-0 right-0 h-full bg-purple-500 flex items-center justify-center text-white text-sm font-semibold transition-all duration-300"
          style={{ width: `${ytPercentage}%` }}
        >
          {ytPercentage > 10 && `${ytPercentage}% YT`}
        </div>
      </div>

      {/* Quick Presets */}
      <div className="grid grid-cols-5 gap-2 mb-6">
        {[0, 25, 50, 75, 100].map((preset) => (
          <button
            key={preset}
            onClick={() => setPtPercentage(preset)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              ptPercentage === preset
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {preset}% PT
          </button>
        ))}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-xs text-blue-700 dark:text-blue-300 mb-1">PT Investment</p>
          <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
            ${ptAmount.toFixed(2)}
          </p>
          {ptResult && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              → ${ptResult.futureValue.toFixed(2)}
            </p>
          )}
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
          <p className="text-xs text-purple-700 dark:text-purple-300 mb-1">YT Investment</p>
          <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
            ${ytAmount.toFixed(2)}
          </p>
          {ytResult && (
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              → ${ytResult.futureValue.toFixed(2)}
            </p>
          )}
        </div>
      </div>

      {/* Total Metrics */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-green-700 dark:text-green-300">
            Total at Maturity
          </span>
          <span className="text-2xl font-bold text-green-900 dark:text-green-100">
            ${totalValue.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-green-600 dark:text-green-400">Total Return</span>
          <span className={`font-semibold ${totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalReturn > 0 ? '+' : ''}
            {totalReturn.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Risk Score */}
      <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Blended Risk Score
        </span>
        <span className={`text-lg font-bold ${getRiskColor(blendedRisk)}`}>
          {blendedRisk}/100
        </span>
      </div>

      {/* Recommendation Badge */}
      {isOptimal ? (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200">
            ✅ <strong>Optimal Range:</strong> Your allocation is close to the recommended strategy!
          </p>
        </div>
      ) : (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            💡 <strong>Recommended:</strong> {recommendedPtPercentage}% PT / {100 - recommendedPtPercentage}% YT
            <button
              onClick={() => setPtPercentage(recommendedPtPercentage)}
              className="ml-2 text-yellow-600 dark:text-yellow-400 underline hover:no-underline"
            >
              Apply
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
