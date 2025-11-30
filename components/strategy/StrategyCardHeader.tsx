'use client';

import React from 'react';
import { CardHeader } from '@/components/ui/card';

interface StrategyCardHeaderProps {
  poolName: string;
  maturity: string;
  score: number;
  riskFactor: number;
  mode: 'default' | 'advanced';
  onModeChange: (mode: 'default' | 'advanced') => void;
}

export const StrategyCardHeader: React.FC<StrategyCardHeaderProps> = React.memo(({
  poolName,
  maturity,
  score,
  riskFactor,
  mode,
  onModeChange,
}) => {
  const scoreColor = score > 80 ? '#059669' : score > 60 ? '#d97706' : '#dc2626';

  return (
    <CardHeader>
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{poolName}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Maturity: {maturity}</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <span
              className="font-semibold text-lg"
              style={{ color: scoreColor }}
            >
              Score: {score}
            </span>
            <select
              value={mode}
              onChange={(e) => onModeChange(e.target.value as 'default' | 'advanced')}
              className="text-xs px-2 py-1 border rounded-lg bg-white dark:bg-gray-700 dark:text-white"
            >
              <option value="default">Default</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <span className="text-gray-500 dark:text-gray-400 text-sm">
            Risk: {(riskFactor * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </CardHeader>
  );
});

StrategyCardHeader.displayName = 'StrategyCardHeader';
