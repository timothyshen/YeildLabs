'use client';

import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  gradient?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  className?: string;
}

const gradientClasses = {
  blue: 'gradient-blue',
  green: 'gradient-green',
  purple: 'gradient-purple',
  orange: 'from-orange-500 to-orange-600',
  red: 'from-red-500 to-red-600',
};

const glowClasses = {
  blue: 'glow-blue',
  green: 'glow-green',
  purple: 'glow-purple',
  orange: '',
  red: '',
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  gradient = 'blue',
  className = '',
}: StatCardProps) {
  const formatValue = (val: string | number): string => {
    if (typeof val === 'number') {
      if (val >= 1_000_000) {
        return `$${(val / 1_000_000).toFixed(1)}M`;
      }
      if (val >= 1_000) {
        return `$${(val / 1_000).toFixed(0)}K`;
      }
      return `$${val.toFixed(2)}`;
    }
    return val;
  };

  return (
    <div
      className={`${gradientClasses[gradient]} ${glowClasses[gradient]} rounded-xl p-6 text-white transition-all hover:scale-105 ${className}`}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm opacity-90">{title}</p>
        {icon && <div className="text-2xl opacity-80">{icon}</div>}
      </div>
      <p className="text-3xl font-bold mb-1">{formatValue(value)}</p>
      {subtitle && (
        <p className="text-xs opacity-75">{subtitle}</p>
      )}
      {trend && (
        <div className={`mt-2 text-xs font-medium ${
          trend.isPositive ? 'text-green-200' : 'text-red-200'
        }`}>
          {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value).toFixed(2)}%
        </div>
      )}
    </div>
  );
}

