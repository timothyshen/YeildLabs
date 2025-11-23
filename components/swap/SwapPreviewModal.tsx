'use client';

import { useState } from 'react';
import { X, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import type { SwapQuote } from '@/lib/1inch/types';

interface SwapPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  quote: SwapQuote | null;
  isLoading?: boolean;
  error?: string | null;
}

export function SwapPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  quote,
  isLoading = false,
  error = null,
}: SwapPreviewModalProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  const formatNumber = (value: string | number, decimals: number = 4) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num.toFixed(decimals);
  };

  const priceImpactColor = (impact?: number) => {
    if (!impact) return 'text-gray-600 dark:text-gray-400';
    if (impact < 1) return 'text-green-600 dark:text-green-400';
    if (impact < 3) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4">
        <div className="glass rounded-2xl shadow-2xl overflow-hidden border">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Confirm Swap
              </h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {quote && (
              <>
                {/* Swap Preview */}
                <div className="space-y-4">
                  {/* From Token */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800/30">
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2 uppercase tracking-wide">
                      You Pay
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                        {formatNumber(quote.fromAmount)}
                      </p>
                      <span className="px-3 py-1 bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100 rounded-full text-sm font-semibold">
                        {quote.fromToken.symbol}
                      </span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex justify-center">
                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                      <ArrowRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                  </div>

                  {/* To Token */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 border border-green-200 dark:border-green-800/30">
                    <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-2 uppercase tracking-wide">
                      You Receive
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                        {formatNumber(quote.toAmount)}
                      </p>
                      <span className="px-3 py-1 bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100 rounded-full text-sm font-semibold">
                        {quote.toToken.symbol}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Swap Details */}
                <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Exchange Rate</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      1 {quote.fromToken.symbol} = {formatNumber(quote.executionPrice, 6)} {quote.toToken.symbol}
                    </span>
                  </div>

                  {quote.priceImpact !== undefined && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Price Impact</span>
                      <span className={`font-medium ${priceImpactColor(quote.priceImpact)}`}>
                        {quote.priceImpact.toFixed(2)}%
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Slippage Tolerance</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {quote.slippage}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Est. Gas</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {quote.estimatedGas.toLocaleString()}
                    </span>
                  </div>

                  {quote.protocols.length > 0 && (
                    <div className="flex items-start justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Route</span>
                      <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                        {quote.protocols.slice(0, 3).map((protocol, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs font-medium"
                          >
                            {protocol.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Warning for high price impact */}
                {quote.priceImpact && quote.priceImpact > 3 && (
                  <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-orange-700 dark:text-orange-300">
                      <p className="font-medium mb-1">High Price Impact</p>
                      <p className="text-xs">This swap has a high price impact. Consider reducing the amount.</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isConfirming}
                className="flex-1 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isConfirming || isLoading || !quote || !!error}
                className="flex-1 px-4 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isConfirming ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Confirming...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Confirm Swap</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3">
              Please confirm the transaction in your wallet
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
