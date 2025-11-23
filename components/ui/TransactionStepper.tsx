'use client';

import React from 'react';
import { Check, Loader2, ExternalLink, AlertCircle } from 'lucide-react';

export type TransactionStep = {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  txHash?: string;
  error?: string;
};

interface TransactionStepperProps {
  steps: TransactionStep[];
  currentStepIndex: number;
  chainId?: number;
}

export function TransactionStepper({ steps, currentStepIndex, chainId = 8453 }: TransactionStepperProps) {
  const getBlockExplorerUrl = (txHash: string) => {
    // Base mainnet
    if (chainId === 8453) {
      return `https://basescan.org/tx/${txHash}`;
    }
    return `https://etherscan.io/tx/${txHash}`;
  };

  const getStepIcon = (step: TransactionStep, index: number) => {
    if (step.status === 'completed') {
      return (
        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
          <Check className="w-5 h-5 text-white" />
        </div>
      );
    }

    if (step.status === 'error') {
      return (
        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-white" />
        </div>
      );
    }

    if (step.status === 'in_progress') {
      return (
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-white animate-spin" />
        </div>
      );
    }

    // pending
    return (
      <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{index + 1}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="relative">
            {/* Connector Line */}
            {!isLast && (
              <div
                className={`absolute left-4 top-8 w-0.5 h-full -ml-px transition-colors ${
                  step.status === 'completed'
                    ? 'bg-green-500'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            )}

            {/* Step Content */}
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="flex-shrink-0 relative z-10">
                {getStepIcon(step, index)}
              </div>

              {/* Text Content */}
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <h4
                    className={`text-sm font-semibold ${
                      step.status === 'in_progress'
                        ? 'text-blue-900 dark:text-blue-100'
                        : step.status === 'completed'
                        ? 'text-green-900 dark:text-green-100'
                        : step.status === 'error'
                        ? 'text-red-900 dark:text-red-100'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {step.title}
                  </h4>

                  {/* Transaction Hash Link */}
                  {step.txHash && (
                    <a
                      href={getBlockExplorerUrl(step.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                    >
                      <span>View Tx</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <p
                  className={`text-xs mt-0.5 ${
                    step.status === 'error'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {step.error || step.description}
                </p>

                {/* Progress indicator for current step */}
                {step.status === 'in_progress' && (
                  <div className="mt-2 space-y-1">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full animate-progress-indeterminate" />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Please confirm in your wallet...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Success Celebration */}
      {steps.every(step => step.status === 'completed') && (
        <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center animate-bounce-once">
              <Check className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-green-900 dark:text-green-100">
                Transaction Complete! 🎉
              </h4>
              <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                Your position has been successfully created
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
