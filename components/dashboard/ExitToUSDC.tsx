'use client';

import { useState } from 'react';
import type { UserPosition } from '@/types';

interface ExitToUSDCProps {
  positions: UserPosition[];
  onExit: (positions: string[]) => Promise<void>;
}

export function ExitToUSDC({ positions, onExit }: ExitToUSDCProps) {
  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(new Set());
  const [isExiting, setIsExiting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const totalExitValue = positions
    .filter(p => selectedPositions.has(p.pool))
    .reduce((sum, p) => sum + p.currentValue, 0);

  const handleTogglePosition = (pool: string) => {
    const newSelected = new Set(selectedPositions);
    if (newSelected.has(pool)) {
      newSelected.delete(pool);
    } else {
      newSelected.add(pool);
    }
    setSelectedPositions(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedPositions.size === positions.length) {
      setSelectedPositions(new Set());
    } else {
      setSelectedPositions(new Set(positions.map(p => p.pool)));
    }
  };

  const handleExit = async () => {
    setIsExiting(true);
    try {
      await onExit(Array.from(selectedPositions));
      setSelectedPositions(new Set());
      setShowPreview(false);
    } catch (error) {
      console.error('Exit failed:', error);
    } finally {
      setIsExiting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Exit to USDC
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Convert your positions back to USDC in one transaction
          </p>
        </div>
        <button
          onClick={handleSelectAll}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          {selectedPositions.size === positions.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {positions.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No positions to exit
        </div>
      ) : (
        <>
          {/* Position Selection */}
          <div className="space-y-2 mb-6">
            {positions.map((position) => (
              <label
                key={position.pool}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedPositions.has(position.pool)}
                    onChange={() => handleTogglePosition(position.pool)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {position.pool}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      PT: {position.ptBalance.toFixed(2)} | YT: {position.ytBalance.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 dark:text-white">
                    {formatCurrency(position.currentValue)}
                  </p>
                  <p className={`text-sm ${
                    position.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {position.unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(position.unrealizedPnL)}
                  </p>
                </div>
              </label>
            ))}
          </div>

          {/* Exit Summary */}
          {selectedPositions.size > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-blue-900 dark:text-blue-100">
                  Selected Positions
                </span>
                <span className="font-bold text-blue-900 dark:text-blue-100">
                  {selectedPositions.size}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-900 dark:text-blue-100">
                  Total Exit Value
                </span>
                <span className="text-xl font-bold text-blue-900 dark:text-blue-100">
                  {formatCurrency(totalExitValue)}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowPreview(true)}
              disabled={selectedPositions.size === 0 || isExiting}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
            >
              Preview Exit
            </button>
          </div>

          {/* Preview Modal */}
          {showPreview && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Confirm Exit to USDC
                </h4>

                <div className="mb-6 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Positions</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedPositions.size}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Estimated USDC</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(totalExitValue)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Est. Gas</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      ~$5.00
                    </span>
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-6">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    ⚠️ This will sell your PT/YT positions and swap to USDC via 1inch.
                    The transaction cannot be reversed.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPreview(false)}
                    disabled={isExiting}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExit}
                    disabled={isExiting}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-semibold transition-colors"
                  >
                    {isExiting ? 'Exiting...' : 'Confirm Exit'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
