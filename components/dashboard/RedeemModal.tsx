'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { usePendleRedeem } from '@/lib/hooks/usePendleRedeem';
import { X, AlertCircle, TrendingDown, ArrowRight } from 'lucide-react';
import { parseUnits } from 'viem';
import { getTokenInfoByAddress } from '@/lib/utils/tokenAddress';

interface RedeemModalProps {
  position: any;
  tokenType: 'PT' | 'YT' | 'BOTH';
  onClose: () => void;
  onSuccess?: () => void;
}

export function RedeemModal({ position, tokenType, onClose, onSuccess }: RedeemModalProps) {
  const { address } = useAccount();
  const {
    executeRedeemPy,
    executeRedeemSy,
    hash,
    isLoading,
    isSuccess,
    isError,
    error,
  } = usePendleRedeem();

  const [redeemAmount, setRedeemAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [estimatedOutput, setEstimatedOutput] = useState<number>(0);

  // Get token balances
  const ptBalance = position.ptBalanceFormatted || 0;
  const ytBalance = position.ytBalanceFormatted || 0;
  const maxAmount = tokenType === 'PT' ? ptBalance : tokenType === 'YT' ? ytBalance : Math.min(ptBalance, ytBalance);

  // Get pool info
  const pool = position.pool;
  const underlyingAsset = pool?.underlyingAsset;
  const ptToken = pool?.ptToken || pool?.ptAddress;
  const ytToken = pool?.ytToken || pool?.ytAddress;
  const syToken = pool?.syToken || pool?.syAddress;

  // Calculate estimated output
  useEffect(() => {
    const amount = parseFloat(redeemAmount) || 0;
    if (amount > 0) {
      if (tokenType === 'PT') {
        // PT redeems at PT price
        const estimated = amount * (pool?.ptPrice || 1);
        setEstimatedOutput(estimated);
      } else if (tokenType === 'YT') {
        // YT redeems at YT price (usually very low)
        const estimated = amount * (pool?.ytPrice || 0.01);
        setEstimatedOutput(estimated);
      } else {
        // BOTH: PT + YT = 1 underlying at maturity
        const estimated = amount; // 1:1 if both PT and YT
        setEstimatedOutput(estimated);
      }
    } else {
      setEstimatedOutput(0);
    }
  }, [redeemAmount, tokenType, pool]);

  const handleRedeem = async () => {
    if (!address || !redeemAmount || parseFloat(redeemAmount) <= 0) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Get token info for decimals
      const underlyingTokenInfo = getTokenInfoByAddress(
        typeof underlyingAsset === 'string' ? underlyingAsset : underlyingAsset?.address,
        pool?.chainId || 8453
      );

      const decimals = underlyingTokenInfo?.decimals || 18;
      const amount = parseFloat(redeemAmount);

      if (tokenType === 'BOTH') {
        // Redeem both PT and YT together
        const amountWei = parseUnits(amount.toString(), decimals).toString();

        await executeRedeemPy({
          chainId: pool?.chainId || 8453,
          ptToken: typeof ptToken === 'string' ? ptToken : ptToken?.address,
          ytToken: typeof ytToken === 'string' ? ytToken : ytToken?.address,
          ptAmount: amountWei,
          ytAmount: amountWei,
          tokenOut: typeof underlyingAsset === 'string' ? underlyingAsset : underlyingAsset?.address,
          receiver: address,
          slippage: 0.02, // 2% slippage
        });
      } else if (tokenType === 'PT') {
        // Redeem PT only - first convert to SY, then to underlying
        const amountWei = parseUnits(amount.toString(), decimals).toString();

        // For PT-only redemption, we swap PT to underlying via the redeem endpoint
        await executeRedeemPy({
          chainId: pool?.chainId || 8453,
          ptToken: typeof ptToken === 'string' ? ptToken : ptToken?.address,
          ytToken: typeof ytToken === 'string' ? ytToken : ytToken?.address,
          ptAmount: amountWei,
          ytAmount: '0', // No YT
          tokenOut: typeof underlyingAsset === 'string' ? underlyingAsset : underlyingAsset?.address,
          receiver: address,
          slippage: 0.02,
        });
      } else if (tokenType === 'YT') {
        // Redeem YT only
        const amountWei = parseUnits(amount.toString(), decimals).toString();

        await executeRedeemPy({
          chainId: pool?.chainId || 8453,
          ptToken: typeof ptToken === 'string' ? ptToken : ptToken?.address,
          ytToken: typeof ytToken === 'string' ? ytToken : ytToken?.address,
          ptAmount: '0', // No PT
          ytAmount: amountWei,
          tokenOut: typeof underlyingAsset === 'string' ? underlyingAsset : underlyingAsset?.address,
          receiver: address,
          slippage: 0.02,
        });
      }
    } catch (err) {
      console.error('Redeem error:', err);
      setIsSubmitting(false);
    }
  };

  // Handle success
  useEffect(() => {
    if (isSuccess) {
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    }
  }, [isSuccess, onSuccess, onClose]);

  const getTitle = () => {
    if (tokenType === 'PT') return 'Redeem PT';
    if (tokenType === 'YT') return 'Redeem YT';
    return 'Redeem PT + YT';
  };

  const getDescription = () => {
    if (tokenType === 'PT') return 'Exit your PT position and receive underlying assets';
    if (tokenType === 'YT') return 'Exit your YT position and receive underlying assets';
    return 'Exit both PT and YT positions together (at maturity: 1 PT + 1 YT = 1 underlying)';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {getTitle()}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {getDescription()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Pool Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {pool?.name}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Underlying: {typeof underlyingAsset === 'string' ? underlyingAsset : underlyingAsset?.symbol}
            </p>
          </div>

          {/* Current Balance */}
          <div className="grid grid-cols-2 gap-4">
            {(tokenType === 'PT' || tokenType === 'BOTH') && (
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">PT Balance</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {ptBalance.toFixed(4)}
                </p>
              </div>
            )}
            {(tokenType === 'YT' || tokenType === 'BOTH') && (
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">YT Balance</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {ytBalance.toFixed(4)}
                </p>
              </div>
            )}
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Amount to Redeem
            </label>
            <div className="relative">
              <input
                type="number"
                value={redeemAmount}
                onChange={(e) => setRedeemAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                max={maxAmount}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => setRedeemAmount(maxAmount.toString())}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded"
              >
                MAX
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Available: {maxAmount.toFixed(4)} {tokenType === 'BOTH' ? 'pairs' : tokenType}
            </p>
          </div>

          {/* Estimated Output */}
          {estimatedOutput > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-900 dark:text-green-100">
                  Estimated Output
                </span>
                <ArrowRight className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {estimatedOutput.toFixed(4)} {typeof underlyingAsset === 'string' ? underlyingAsset : underlyingAsset?.symbol}
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                ≈ ${(estimatedOutput * (underlyingAsset?.priceUSD || 1)).toFixed(2)}
              </p>
            </div>
          )}

          {/* Warning for PT/YT only redemption */}
          {tokenType !== 'BOTH' && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                    {tokenType === 'PT' ? 'Redeeming PT Only' : 'Redeeming YT Only'}
                  </p>
                  <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                    {tokenType === 'PT'
                      ? 'You will receive less than face value if redeeming before maturity. PT price decreases the further from maturity.'
                      : 'YT has very low redemption value. Consider selling YT on the secondary market instead for better returns.'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Transaction Status */}
          {isSubmitting && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                {isLoading ? 'Waiting for confirmation...' : 'Preparing transaction...'}
              </p>
            </div>
          )}

          {isSuccess && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm text-green-900 dark:text-green-100 flex items-center gap-2">
                ✅ Redemption successful!
              </p>
              {hash && (
                <a
                  href={`https://basescan.org/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-700 dark:text-green-300 hover:underline mt-1 block"
                >
                  View transaction →
                </a>
              )}
            </div>
          )}

          {isError && error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-900 dark:text-red-100">
                ❌ Error: {error.message}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleRedeem}
            disabled={!redeemAmount || parseFloat(redeemAmount) <= 0 || parseFloat(redeemAmount) > maxAmount || isSubmitting || isSuccess}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <TrendingDown className="w-5 h-5" />
            {isSubmitting ? 'Processing...' : 'Redeem'}
          </button>
        </div>
      </div>
    </div>
  );
}
