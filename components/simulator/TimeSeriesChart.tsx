'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { SimulatorInput } from '@/types';
import { generateTimeSeriesData } from '@/lib/utils/simulator';

interface TimeSeriesChartProps {
  input: SimulatorInput;
}

export function TimeSeriesChart({ input }: TimeSeriesChartProps) {
  const data = useMemo(() => generateTimeSeriesData(input), [input]);

  return (
    <div className="glass rounded-xl p-6 shadow-lg">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Value Progression Over Time
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        How your investment value changes from purchase to maturity
      </p>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            stroke="#9ca3af"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="#9ca3af"
            tickFormatter={(value) => `$${value.toFixed(0)}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(17, 24, 39, 0.9)',
              border: '1px solid rgba(75, 85, 99, 0.5)',
              borderRadius: '8px',
              color: '#fff',
            }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
            labelStyle={{ color: '#9ca3af' }}
          />
          <Legend />

          {(input.type === 'PT' || input.type === 'BOTH') && (
            <Line
              type="monotone"
              dataKey="ptValue"
              stroke="#3b82f6"
              strokeWidth={2}
              name="PT Value"
              dot={false}
            />
          )}

          {(input.type === 'YT' || input.type === 'BOTH') && (
            <Line
              type="monotone"
              dataKey="ytValue"
              stroke="#a855f7"
              strokeWidth={2}
              name="YT Value"
              dot={false}
            />
          )}

          <Line
            type="monotone"
            dataKey="totalValue"
            stroke="#10b981"
            strokeWidth={3}
            name="Total Value"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">Starting Value</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            ${input.amount.toFixed(2)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">Current (Mid-point)</p>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
            ${data[Math.floor(data.length / 2)]?.totalValue.toFixed(2)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">At Maturity</p>
          <p className="text-lg font-bold text-green-600 dark:text-green-400">
            ${data[data.length - 1]?.totalValue.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-xs text-blue-800 dark:text-blue-200">
          <strong>💡 How to read this chart:</strong> {' '}
          {input.type === 'PT' && 'PT value gradually increases towards face value (1.0) at maturity, giving you a predictable growth path.'}
          {input.type === 'YT' && 'YT accumulates yield over time but decreases in market value as maturity approaches (less future yield remaining).'}
          {input.type === 'BOTH' && 'PT value increases steadily while YT accumulates yield. Together they provide balanced exposure.'}
        </p>
      </div>
    </div>
  );
}
