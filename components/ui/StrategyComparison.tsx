'use client';

import React, { memo, useState, useMemo } from 'react';
import {
  X,
  Plus,
  TrendingUp,
  TrendingDown,
  Shield,
  Zap,
  Clock,
  DollarSign,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { RiskExplainerBadge } from './RiskExplainer';
import type { PendlePool } from '@/types';

interface ComparisonItem {
  id: string;
  pool: PendlePool;
  strategy: 'PT' | 'YT' | 'SPLIT';
  allocation: { pt: number; yt: number };
  investmentAmount?: number;
}

interface StrategyComparisonProps {
  items: ComparisonItem[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onSelect: (id: string) => void;
  maxItems?: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercent = (value: number) => {
  return `${(value * 100).toFixed(2)}%`;
};

const ComparisonRow = memo(function ComparisonRow({
  label,
  values,
  format = 'text',
  highlight = 'none',
  icon: Icon,
}: {
  label: string;
  values: (string | number | React.ReactNode)[];
  format?: 'text' | 'currency' | 'percent' | 'custom';
  highlight?: 'highest' | 'lowest' | 'none';
  icon?: React.ElementType;
}) {
  const formattedValues = values.map((v) => {
    if (typeof v === 'number') {
      switch (format) {
        case 'currency':
          return formatCurrency(v);
        case 'percent':
          return formatPercent(v);
        default:
          return v.toString();
      }
    }
    return v;
  });

  const numericValues = values.filter((v) => typeof v === 'number') as number[];
  const bestIndex =
    highlight === 'highest'
      ? values.indexOf(Math.max(...numericValues))
      : highlight === 'lowest'
        ? values.indexOf(Math.min(...numericValues))
        : -1;

  return (
    <tr className="border-b border-gray-100 dark:border-gray-700">
      <td className="py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-gray-400" />}
        {label}
      </td>
      {formattedValues.map((value, i) => (
        <td
          key={i}
          className={`py-3 px-4 text-center text-sm ${
            i === bestIndex
              ? 'font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
              : 'text-gray-900 dark:text-white'
          }`}
        >
          {value}
          {i === bestIndex && (
            <span className="ml-1 text-xs">✓</span>
          )}
        </td>
      ))}
    </tr>
  );
});

const ComparisonCard = memo(function ComparisonCard({
  item,
  onRemove,
  isSelected,
  onSelect,
}: {
  item: ComparisonItem;
  onRemove: () => void;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { pool, strategy, allocation } = item;

  const getStrategyColor = () => {
    switch (strategy) {
      case 'PT':
        return 'from-blue-500 to-blue-600';
      case 'YT':
        return 'from-purple-500 to-purple-600';
      case 'SPLIT':
        return 'from-green-500 to-green-600';
    }
  };

  return (
    <div
      className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer ${
        isSelected
          ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
      onClick={onSelect}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-2 right-2 p-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
      >
        <X className="w-4 h-4 text-gray-500" />
      </button>

      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r ${getStrategyColor()} text-white text-xs font-medium mb-3`}>
        {strategy === 'PT' && <Shield className="w-3 h-3" />}
        {strategy === 'YT' && <Zap className="w-3 h-3" />}
        {strategy === 'SPLIT' && <TrendingUp className="w-3 h-3" />}
        {strategy}
      </div>

      <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 pr-6">
        {pool.name}
      </h4>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        {pool.daysToMaturity} days to maturity
      </p>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">APY</span>
        <span className="font-bold text-green-600 dark:text-green-400">
          {formatPercent(pool.apy / 100)}
        </span>
      </div>

      {strategy === 'SPLIT' && (
        <div className="mt-2 flex gap-1">
          <div
            className="h-2 bg-blue-500 rounded-l"
            style={{ width: `${allocation.pt}%` }}
            title={`PT: ${allocation.pt}%`}
          />
          <div
            className="h-2 bg-purple-500 rounded-r"
            style={{ width: `${allocation.yt}%` }}
            title={`YT: ${allocation.yt}%`}
          />
        </div>
      )}

      {isSelected && (
        <div className="absolute bottom-2 right-2">
          <Check className="w-5 h-5 text-blue-500" />
        </div>
      )}
    </div>
  );
});

export const StrategyComparison = memo(function StrategyComparison({
  items,
  onRemove,
  onClear,
  onSelect,
  maxItems = 4,
}: StrategyComparisonProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const calculations = useMemo(() => {
    return items.map((item) => {
      const { pool, strategy, allocation, investmentAmount = 1000 } = item;
      const daysToMaturity = pool.daysToMaturity;
      const annualizedReturn = pool.apy / 100;

      // Calculate expected returns
      const ptReturn = pool.ptDiscount * investmentAmount;
      const ytReturn = (annualizedReturn * (daysToMaturity / 365)) * investmentAmount;

      let expectedReturn: number;
      let riskScore: number;

      switch (strategy) {
        case 'PT':
          expectedReturn = ptReturn;
          riskScore = 0.2;
          break;
        case 'YT':
          expectedReturn = ytReturn;
          riskScore = 0.7;
          break;
        case 'SPLIT':
          expectedReturn =
            (ptReturn * allocation.pt + ytReturn * allocation.yt) / 100;
          riskScore = 0.2 + (0.5 * (allocation.yt / 100));
          break;
        default:
          expectedReturn = 0;
          riskScore = 0.5;
      }

      const effectiveAPY = (expectedReturn / investmentAmount) * (365 / daysToMaturity);

      return {
        id: item.id,
        expectedReturn,
        effectiveAPY,
        riskScore,
        tvl: pool.tvl,
        liquidity: pool.tvl > 1000000 ? 'High' : pool.tvl > 100000 ? 'Medium' : 'Low',
        maturity: daysToMaturity,
      };
    });
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
        <Plus className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Compare Strategies
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Add up to {maxItems} strategies to compare side by side
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          Click "Add to Compare" on any strategy card
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Strategy Comparison
          </h3>
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs rounded-full">
            {items.length}/{maxItems}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClear}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Strategy Cards */}
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            {items.map((item) => (
              <ComparisonCard
                key={item.id}
                item={item}
                onRemove={() => onRemove(item.id)}
                isSelected={selectedId === item.id}
                onSelect={() => {
                  setSelectedId(item.id === selectedId ? null : item.id);
                  onSelect(item.id);
                }}
              />
            ))}
            {items.length < maxItems && (
              <div className="p-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                <div className="text-center">
                  <Plus className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Add Strategy
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50">
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Metric
                  </th>
                  {items.map((item) => (
                    <th
                      key={item.id}
                      className="py-3 px-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase"
                    >
                      {item.strategy}
                      <RiskExplainerBadge type={item.strategy} showLabel={false} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <ComparisonRow
                  label="Expected APY"
                  values={calculations.map((c) => c.effectiveAPY)}
                  format="percent"
                  highlight="highest"
                  icon={TrendingUp}
                />
                <ComparisonRow
                  label="Expected Return"
                  values={calculations.map((c) => c.expectedReturn)}
                  format="currency"
                  highlight="highest"
                  icon={DollarSign}
                />
                <ComparisonRow
                  label="Risk Score"
                  values={calculations.map((c) => c.riskScore)}
                  format="percent"
                  highlight="lowest"
                  icon={AlertTriangle}
                />
                <ComparisonRow
                  label="Days to Maturity"
                  values={calculations.map((c) => c.maturity)}
                  format="text"
                  icon={Clock}
                />
                <ComparisonRow
                  label="TVL"
                  values={calculations.map((c) => c.tvl)}
                  format="currency"
                  highlight="highest"
                  icon={DollarSign}
                />
                <ComparisonRow
                  label="Liquidity"
                  values={calculations.map((c) => c.liquidity)}
                  format="text"
                />
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Recommendation
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Based on your comparison
                </p>
              </div>
              {calculations.length > 0 && (
                <div className="text-right">
                  {(() => {
                    const bestAPY = Math.max(...calculations.map((c) => c.effectiveAPY));
                    const bestItem = items[calculations.findIndex((c) => c.effectiveAPY === bestAPY)];
                    const bestCalc = calculations.find((c) => c.effectiveAPY === bestAPY);

                    return bestItem && bestCalc ? (
                      <>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {bestItem.strategy} Strategy
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Best APY: {formatPercent(bestCalc.effectiveAPY)}
                        </p>
                      </>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
});

// Hook to manage comparison state
export function useStrategyComparison(maxItems = 4) {
  const [comparisonItems, setComparisonItems] = useState<ComparisonItem[]>([]);

  const addToComparison = (
    pool: PendlePool,
    strategy: 'PT' | 'YT' | 'SPLIT',
    allocation: { pt: number; yt: number } = { pt: 80, yt: 20 },
    investmentAmount?: number
  ) => {
    const id = `${pool.address}-${strategy}`;

    // Check if already exists
    if (comparisonItems.some((item) => item.id === id)) {
      return false;
    }

    // Check max items
    if (comparisonItems.length >= maxItems) {
      return false;
    }

    setComparisonItems((prev) => [
      ...prev,
      { id, pool, strategy, allocation, investmentAmount },
    ]);
    return true;
  };

  const removeFromComparison = (id: string) => {
    setComparisonItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearComparison = () => {
    setComparisonItems([]);
  };

  const isInComparison = (poolAddress: string, strategy: 'PT' | 'YT' | 'SPLIT') => {
    return comparisonItems.some(
      (item) => item.id === `${poolAddress}-${strategy}`
    );
  };

  return {
    items: comparisonItems,
    addToComparison,
    removeFromComparison,
    clearComparison,
    isInComparison,
    isFull: comparisonItems.length >= maxItems,
  };
}

export default StrategyComparison;
