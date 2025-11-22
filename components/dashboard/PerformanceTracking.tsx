'use client';

import { useState, useEffect } from 'react';
import { PerformanceChart } from './PerformanceChart';

interface PerformanceTrackingProps {
  address: string;
  currentValue: number;
}

interface HistoricalSnapshot {
  date: string;
  timestamp: number;
  networth?: string;
  [key: string]: any;
}

export function PerformanceTracking({ address, currentValue }: PerformanceTrackingProps) {
  const [snapshots, setSnapshots] = useState<HistoricalSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [days, setDays] = useState(30);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    fetchHistoricalData();
  }, [address, days]);

  const fetchHistoricalData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/octav/historical?address=${address}&days=${days}`);
      const result = await response.json();

      if (result.success && result.data) {
        setSnapshots(result.data);
      } else {
        setError(result.error || 'Failed to fetch historical data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch historical data');
    } finally {
      setIsLoading(false);
    }
  };

  // Transform snapshots to performance chart format
  const performanceData = snapshots.map(snapshot => ({
    date: new Date(snapshot.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    timestamp: snapshot.timestamp,
    value: parseFloat(snapshot.networth || '0') || 0,
    yield: 0, // Historical yield data not available in snapshots
  }));

  // Add current value as the latest point
  if (performanceData.length > 0 && currentValue > 0) {
    const today = new Date();
    performanceData.push({
      date: today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      timestamp: today.getTime(),
      value: currentValue,
      yield: 0,
    });
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Performance Tracking
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Historical portfolio value
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
          </select>
          <button
            onClick={fetchHistoricalData}
            disabled={isLoading}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            {isLoading ? '⏳' : '🔄'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {isLoading && snapshots.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading historical data...</p>
        </div>
      ) : snapshots.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No historical data available</p>
        </div>
      ) : (
        <PerformanceChart data={performanceData} />
      )}
    </div>
  );
}

