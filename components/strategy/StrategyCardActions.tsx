'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { CardFooter } from '@/components/ui/card';
import { ArrowRight, Zap, ArrowLeftRight } from 'lucide-react';

interface StrategyCardActionsProps {
  activeTab: 'invest' | 'redeem';
  isConnected: boolean;
  investmentAmount: string;
  redeemAmount: string;
  hasSufficientBalance: boolean;
  canSwapUSDC: boolean;
  isMintLoading: boolean;
  isRedeemLoading: boolean;
  isExecutingSwap: boolean;
  isBalanceLoading: boolean;
  canRedeemPy: boolean;
  canRedeemSy: boolean;
  onDetails?: () => void;
  onExecute: () => void;
  onSwapAndBuy: () => void;
  onRedeem: () => void;
}

export const StrategyCardActions: React.FC<StrategyCardActionsProps> = React.memo(({
  activeTab,
  isConnected,
  investmentAmount,
  redeemAmount,
  hasSufficientBalance,
  canSwapUSDC,
  isMintLoading,
  isRedeemLoading,
  isExecutingSwap,
  isBalanceLoading,
  canRedeemPy,
  canRedeemSy,
  onDetails,
  onExecute,
  onSwapAndBuy,
  onRedeem,
}) => {
  const isInvestDisabled =
    !isConnected ||
    !investmentAmount ||
    parseFloat(investmentAmount) <= 0 ||
    isMintLoading ||
    isExecutingSwap ||
    (!hasSufficientBalance && !canSwapUSDC) ||
    isBalanceLoading;

  const isRedeemDisabled =
    !isConnected ||
    !redeemAmount ||
    parseFloat(redeemAmount) <= 0 ||
    isRedeemLoading ||
    (!canRedeemPy && !canRedeemSy);

  const getInvestButtonStyle = () => {
    if (canSwapUSDC) {
      return 'bg-purple-600 hover:bg-purple-700 text-white';
    }
    if (!hasSufficientBalance && isConnected && investmentAmount) {
      return 'bg-red-600 hover:bg-red-700 text-white';
    }
    return 'bg-blue-600 hover:bg-blue-700 text-white';
  };

  const renderInvestButton = () => {
    if (isMintLoading || isExecutingSwap) {
      return (
        <>
          <Zap className="w-4 h-4 animate-pulse" />
          {isExecutingSwap ? 'Getting Quote...' : 'Executing...'}
        </>
      );
    }
    if (canSwapUSDC) {
      return (
        <>
          <ArrowLeftRight className="w-4 h-4" />
          Swap & Buy
        </>
      );
    }
    if (!hasSufficientBalance && isConnected && investmentAmount) {
      return (
        <>
          <Zap className="w-4 h-4" />
          Insufficient Balance
        </>
      );
    }
    return (
      <>
        <Zap className="w-4 h-4" />
        Execute Strategy
      </>
    );
  };

  return (
    <CardFooter className="flex justify-between items-center mt-4">
      <Button
        className="text-gray-700 dark:text-gray-300 border rounded-xl px-3"
        variant="outline"
        onClick={onDetails}
      >
        More <ArrowRight className="w-4 ml-1" />
      </Button>

      {activeTab === 'invest' ? (
        <Button
          className={`rounded-xl px-6 py-2 font-medium flex items-center gap-2 disabled:opacity-50 ${getInvestButtonStyle()}`}
          onClick={canSwapUSDC ? onSwapAndBuy : onExecute}
          disabled={isInvestDisabled}
        >
          {renderInvestButton()}
        </Button>
      ) : (
        <Button
          className="rounded-xl px-6 py-2 font-medium flex items-center gap-2 disabled:opacity-50 bg-green-600 hover:bg-green-700 text-white"
          onClick={onRedeem}
          disabled={isRedeemDisabled}
        >
          {isRedeemLoading ? (
            <>
              <ArrowLeftRight className="w-4 h-4 animate-pulse" />
              Redeeming...
            </>
          ) : (
            <>
              <ArrowLeftRight className="w-4 h-4" />
              Redeem Tokens
            </>
          )}
        </Button>
      )}
    </CardFooter>
  );
});

StrategyCardActions.displayName = 'StrategyCardActions';
