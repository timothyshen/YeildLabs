'use client';

import React from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SwapToMintFlowProps {
  investmentAmount: string;
  usdcBalance: number;
  underlyingSymbol: string;
  underlyingAddress: string;
  showSwapPreview: boolean;
  swapQuote: any;
  isLoadingSwapQuote: boolean;
  onSwapPreviewClose: () => void;
  onSwapConfirm: () => Promise<void>;
  onSwapClick: () => void;
  swapStatus: 'idle' | 'confirming' | 'confirmed' | 'error';
}

export const SwapToMintFlow = React.memo(function SwapToMintFlow({
  investmentAmount,
  usdcBalance,
  underlyingSymbol,
  underlyingAddress,
  showSwapPreview,
  swapQuote,
  isLoadingSwapQuote,
  onSwapPreviewClose,
  onSwapConfirm,
  onSwapClick,
  swapStatus,
}: SwapToMintFlowProps) {
  const swapAmount = parseFloat(investmentAmount) || 0;
  const hasEnoughUSDC = usdcBalance >= swapAmount;

  if (!hasEnoughUSDC) {
    return null;
  }

  return (
    <>
      {/* Swap Option Display */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
              💡 USDC Swap Available
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              You have {usdcBalance.toFixed(2)} USDC. We can swap it to {underlyingSymbol} first.
            </p>
          </div>
          <ArrowLeftRight className="w-5 h-5 text-blue-600" />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-blue-700 dark:text-blue-300">Swap Amount:</span>
            <span className="font-semibold text-blue-900 dark:text-blue-100">
              {swapAmount.toFixed(2)} USDC
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-blue-700 dark:text-blue-300">Receive (est.):</span>
            <span className="font-semibold text-blue-900 dark:text-blue-100">
              ~{(swapAmount * 0.98).toFixed(2)} {underlyingSymbol}
            </span>
          </div>
        </div>

        <Button
          onClick={onSwapClick}
          disabled={swapStatus === 'confirming' || swapStatus === 'confirmed'}
          className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          {swapStatus === 'confirming' && 'Swapping...'}
          {swapStatus === 'confirmed' && '✅ Swap Complete'}
          {swapStatus === 'idle' && (
            <>
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              Swap USDC → {underlyingSymbol}
            </>
          )}
          {swapStatus === 'error' && '❌ Swap Failed - Retry'}
        </Button>

        <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 text-center">
          After swapping, you'll be able to mint PT/YT tokens
        </p>
      </div>

    </>
  );
});
