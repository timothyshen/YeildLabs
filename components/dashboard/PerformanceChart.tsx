'use client';

import { useMemo } from 'react';

interface DataPoint {
  date: string;
  value: number;
}

interface PerformanceChartProps {
  data: DataPoint[];
  height?: number;
}

export function PerformanceChart({ data, height = 200 }: PerformanceChartProps) {
  const { points, min, max, pathD } = useMemo(() => {
    if (data.length === 0) {
      return { points: [], min: 0, max: 0, pathD: '' };
    }

    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const width = 800;
    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const points = data.map((d, i) => {
      const x = padding + (i / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((d.value - min) / range) * chartHeight;
      return { x, y, value: d.value };
    });

    const pathD = points.reduce((path, point, i) => {
      if (i === 0) return `M ${point.x} ${point.y}`;
      return `${path} L ${point.x} ${point.y}`;
    }, '');

    return { points, min, max, pathD };
  }, [data, height]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const currentValue = data.length > 0 ? data[data.length - 1].value : 0;
  const startValue = data.length > 0 ? data[0].value : 0;
  const change = currentValue - startValue;
  const changePercent = startValue !== 0 ? (change / startValue) * 100 : 0;
  const isPositive = change >= 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Portfolio Performance
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Last 30 days
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(currentValue)}
          </p>
          <p className={`text-sm font-medium ${
            isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {isPositive ? '+' : ''}{formatCurrency(change)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
          </p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center" style={{ height }}>
          <p className="text-gray-400 dark:text-gray-500">No performance data available</p>
        </div>
      ) : (
        <svg
          viewBox={`0 0 800 ${height}`}
          className="w-full"
          style={{ height }}
        >
          {/* Grid lines */}
          <line
            x1="20"
            y1={height / 2}
            x2="780"
            y2={height / 2}
            stroke="currentColor"
            className="text-gray-200 dark:text-gray-700"
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          {/* Area fill */}
          <path
            d={`${pathD} L ${points[points.length - 1].x} ${height - 20} L 20 ${height - 20} Z`}
            fill="url(#gradient)"
            opacity="0.2"
          />

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke={isPositive ? '#10b981' : '#ef4444'}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points */}
          {points.map((point, i) => (
            <circle
              key={i}
              cx={point.x}
              cy={point.y}
              r="4"
              fill={isPositive ? '#10b981' : '#ef4444'}
              className="hover:r-6 transition-all"
            >
              <title>{formatCurrency(point.value)}</title>
            </circle>
          ))}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop
                offset="0%"
                stopColor={isPositive ? '#10b981' : '#ef4444'}
                stopOpacity="0.8"
              />
              <stop
                offset="100%"
                stopColor={isPositive ? '#10b981' : '#ef4444'}
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
        </svg>
      )}
    </div>
  );
}
