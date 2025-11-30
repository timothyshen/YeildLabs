'use client';

import React, { memo, useState } from 'react';
import {
  Wallet,
  ArrowRight,
  Split,
  Shield,
  Zap,
  Clock,
  DollarSign,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PipelineStep {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  status: 'pending' | 'active' | 'completed';
  value?: string;
  subValue?: string;
}

interface InvestmentPipelineProps {
  asset: {
    symbol: string;
    balance: number;
    valueUSD: number;
  };
  strategy: 'PT' | 'YT' | 'SPLIT';
  allocation: { pt: number; yt: number };
  investmentAmount: number;
  pool: {
    name: string;
    maturity: number;
    ptPrice: number;
    ytPrice: number;
    apy: number;
    ptDiscount: number;
  };
  currentStep?: number;
  showDetails?: boolean;
}

const StepConnector = memo(function StepConnector({
  isCompleted,
}: {
  isCompleted: boolean;
}) {
  return (
    <div className="flex-1 flex items-center justify-center px-2">
      <div
        className={`h-0.5 w-full transition-colors ${
          isCompleted
            ? 'bg-green-500'
            : 'bg-gray-200 dark:bg-gray-700'
        }`}
      />
      <ArrowRight
        className={`w-4 h-4 mx-1 transition-colors ${
          isCompleted
            ? 'text-green-500'
            : 'text-gray-300 dark:text-gray-600'
        }`}
      />
      <div
        className={`h-0.5 w-full transition-colors ${
          isCompleted
            ? 'bg-green-500'
            : 'bg-gray-200 dark:bg-gray-700'
        }`}
      />
    </div>
  );
});

const PipelineStepCard = memo(function PipelineStepCard({
  step,
  isLast,
}: {
  step: PipelineStep;
  isLast: boolean;
}) {
  const Icon = step.icon;

  const getStatusStyles = () => {
    switch (step.status) {
      case 'completed':
        return {
          bg: 'bg-green-100 dark:bg-green-900/30',
          border: 'border-green-500',
          icon: 'text-green-600 dark:text-green-400',
          text: 'text-green-700 dark:text-green-300',
        };
      case 'active':
        return {
          bg: 'bg-blue-100 dark:bg-blue-900/30',
          border: 'border-blue-500',
          icon: 'text-blue-600 dark:text-blue-400',
          text: 'text-blue-700 dark:text-blue-300',
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-800',
          border: 'border-gray-200 dark:border-gray-700',
          icon: 'text-gray-400 dark:text-gray-500',
          text: 'text-gray-500 dark:text-gray-400',
        };
    }
  };

  const styles = getStatusStyles();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`relative flex flex-col items-center`}>
            <div
              className={`w-14 h-14 rounded-xl border-2 ${styles.bg} ${styles.border} flex items-center justify-center transition-all`}
            >
              {step.status === 'completed' ? (
                <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
              ) : (
                <Icon className={`w-6 h-6 ${styles.icon}`} />
              )}
            </div>
            <p className={`mt-2 text-xs font-medium ${styles.text} text-center max-w-[80px]`}>
              {step.label}
            </p>
            {step.value && (
              <p className="text-xs text-gray-900 dark:text-white font-semibold mt-1">
                {step.value}
              </p>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="font-medium">{step.label}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {step.description}
          </p>
          {step.subValue && (
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 font-medium">
              {step.subValue}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

export const InvestmentPipeline = memo(function InvestmentPipeline({
  asset,
  strategy,
  allocation,
  investmentAmount,
  pool,
  currentStep = 0,
  showDetails = true,
}: InvestmentPipelineProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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

  // Calculate expected values
  const daysToMaturity = pool.maturity > Date.now() / 1000
    ? Math.floor((pool.maturity - Date.now() / 1000) / 86400)
    : 0;

  const ptAmount = (investmentAmount * allocation.pt) / 100;
  const ytAmount = (investmentAmount * allocation.yt) / 100;

  const ptTokens = ptAmount / pool.ptPrice;
  const ytTokens = ytAmount / pool.ytPrice;

  const ptReturn = ptTokens * 1 - ptAmount; // PT redeems at $1
  const ytReturn = (pool.apy / 100) * (daysToMaturity / 365) * ytAmount;
  const totalExpectedReturn = ptReturn + ytReturn;
  const effectiveAPY = (totalExpectedReturn / investmentAmount) * (365 / daysToMaturity);

  // Define pipeline steps
  const steps: PipelineStep[] = [
    {
      id: 'source',
      label: 'Your Asset',
      description: `Starting with ${asset.symbol} from your wallet`,
      icon: Wallet,
      status: currentStep > 0 ? 'completed' : currentStep === 0 ? 'active' : 'pending',
      value: formatCurrency(investmentAmount),
      subValue: `${asset.symbol} available: ${formatCurrency(asset.valueUSD)}`,
    },
    {
      id: 'split',
      label: strategy === 'SPLIT' ? 'Split' : 'Convert',
      description: strategy === 'SPLIT'
        ? `Splitting ${allocation.pt}% to PT and ${allocation.yt}% to YT`
        : `Converting to ${strategy}`,
      icon: Split,
      status: currentStep > 1 ? 'completed' : currentStep === 1 ? 'active' : 'pending',
      value: strategy === 'SPLIT' ? `${allocation.pt}/${allocation.yt}` : strategy,
    },
  ];

  if (strategy === 'PT' || strategy === 'SPLIT') {
    steps.push({
      id: 'pt',
      label: 'PT Tokens',
      description: 'Fixed yield until maturity',
      icon: Shield,
      status: currentStep > 2 ? 'completed' : currentStep === 2 ? 'active' : 'pending',
      value: formatCurrency(ptAmount),
      subValue: `${ptTokens.toFixed(2)} PT @ ${formatCurrency(pool.ptPrice)}`,
    });
  }

  if (strategy === 'YT' || strategy === 'SPLIT') {
    steps.push({
      id: 'yt',
      label: 'YT Tokens',
      description: 'Yield collection until maturity',
      icon: Zap,
      status: currentStep > 2 ? 'completed' : currentStep === 2 ? 'active' : 'pending',
      value: formatCurrency(ytAmount),
      subValue: `${ytTokens.toFixed(2)} YT @ ${formatCurrency(pool.ytPrice)}`,
    });
  }

  steps.push({
    id: 'maturity',
    label: 'Maturity',
    description: `In ${daysToMaturity} days`,
    icon: Clock,
    status: currentStep > 3 ? 'completed' : currentStep === 3 ? 'active' : 'pending',
    value: `${daysToMaturity}d`,
    subValue: new Date(pool.maturity * 1000).toLocaleDateString(),
  });

  steps.push({
    id: 'return',
    label: 'Expected Return',
    description: 'Total value at maturity',
    icon: DollarSign,
    status: currentStep > 4 ? 'completed' : currentStep === 4 ? 'active' : 'pending',
    value: formatCurrency(investmentAmount + totalExpectedReturn),
    subValue: `+${formatCurrency(totalExpectedReturn)} (${formatPercent(effectiveAPY)} APY)`,
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            strategy === 'PT'
              ? 'bg-blue-100 dark:bg-blue-900/30'
              : strategy === 'YT'
                ? 'bg-purple-100 dark:bg-purple-900/30'
                : 'bg-green-100 dark:bg-green-900/30'
          }`}>
            {strategy === 'PT' && <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            {strategy === 'YT' && <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
            {strategy === 'SPLIT' && <Split className="w-5 h-5 text-green-600 dark:text-green-400" />}
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
              Investment Pipeline
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {pool.name}
            </p>
          </div>
        </div>
        {showDetails && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
        )}
      </div>

      {/* Pipeline Visualization */}
      <div className="p-6 overflow-x-auto">
        <div className="flex items-start justify-between min-w-max">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <PipelineStepCard step={step} isLast={index === steps.length - 1} />
              {index < steps.length - 1 && (
                <StepConnector isCompleted={step.status === 'completed'} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Expanded Details */}
      {showDetails && isExpanded && (
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Investment</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatCurrency(investmentAmount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Strategy</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {strategy === 'SPLIT' ? `${allocation.pt}% PT / ${allocation.yt}% YT` : `100% ${strategy}`}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Expected Return</p>
              <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                +{formatCurrency(totalExpectedReturn)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Effective APY</p>
              <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                {formatPercent(effectiveAPY)}
              </p>
            </div>
          </div>

          {/* Breakdown */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-3">
              <Info className="w-3.5 h-3.5" />
              <span>Breakdown</span>
            </div>
            <div className="space-y-2">
              {(strategy === 'PT' || strategy === 'SPLIT') && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-500" />
                    <span className="text-gray-700 dark:text-gray-300">PT Return</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    +{formatCurrency(ptReturn)} ({formatPercent(pool.ptDiscount)} discount)
                  </span>
                </div>
              )}
              {(strategy === 'YT' || strategy === 'SPLIT') && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-500" />
                    <span className="text-gray-700 dark:text-gray-300">YT Return (est.)</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    +{formatCurrency(ytReturn)} ({formatPercent(pool.apy / 100)} APY)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// Compact version for inline use
export const InvestmentPipelineCompact = memo(function InvestmentPipelineCompact({
  strategy,
  allocation,
  investmentAmount,
  expectedReturn,
  apy,
}: {
  strategy: 'PT' | 'YT' | 'SPLIT';
  allocation: { pt: number; yt: number };
  investmentAmount: number;
  expectedReturn: number;
  apy: number;
}) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <div className="flex items-center gap-2 text-sm">
        <Wallet className="w-4 h-4 text-gray-400" />
        <span className="font-medium text-gray-900 dark:text-white">
          {formatCurrency(investmentAmount)}
        </span>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-400" />
      <div className="flex items-center gap-2 text-sm">
        {strategy === 'SPLIT' ? (
          <Split className="w-4 h-4 text-green-500" />
        ) : strategy === 'PT' ? (
          <Shield className="w-4 h-4 text-blue-500" />
        ) : (
          <Zap className="w-4 h-4 text-purple-500" />
        )}
        <span className="text-gray-600 dark:text-gray-400">
          {strategy === 'SPLIT' ? `${allocation.pt}/${allocation.yt}` : strategy}
        </span>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-400" />
      <div className="flex items-center gap-2 text-sm">
        <DollarSign className="w-4 h-4 text-green-500" />
        <span className="font-semibold text-green-600 dark:text-green-400">
          +{formatCurrency(expectedReturn)}
        </span>
        <span className="text-xs text-gray-500">({(apy * 100).toFixed(1)}% APY)</span>
      </div>
    </div>
  );
});

export default InvestmentPipeline;
