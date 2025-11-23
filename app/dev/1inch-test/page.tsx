'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectKitButton } from 'connectkit';
import { use1inchSwap } from '@/lib/hooks/use1inchSwap';
import { SwapPreviewModal } from '@/components/swap/SwapPreviewModal';
import { BASE_TOKENS } from '@/lib/1inch/config';

export default function OneInchTestPage() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('100');
  const [showModal, setShowModal] = useState(false);

  const {
    quote,
    isLoading,
    error,
    getQuote,
    reset,
  } = use1inchSwap();

  const handleGetQuote = async () => {
    await getQuote({
      fromToken: BASE_TOKENS.USDC,
      toToken: BASE_TOKENS.USDe,
      amount,
      fromSymbol: 'USDC',
      toSymbol: 'USDe',
      fromDecimals: 6,  // USDC has 6 decimals
      toDecimals: 18,   // USDe has 18 decimals
      slippage: 1,
      chainId: 8453,    // Base
    });
  };

  const handleConfirmSwap = async () => {
    console.log('Swap confirmed! Quote:', quote);
    // TODO: Implement actual swap execution
    alert('Swap functionality will be implemented next!');
    setShowModal(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              1inch Swap Test
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Test USDC → USDe swap on Base chain
            </p>
          </div>

          {/* Connect Wallet */}
          {!isConnected ? (
            <div className="glass rounded-xl p-12 text-center shadow-lg">
              <div className="text-6xl mb-4">🔐</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Connect Your Wallet
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Connect your wallet to test 1inch swap functionality
              </p>
              <div className="flex justify-center">
                <ConnectKitButton />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Token Info */}
              <div className="glass rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Swap Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">From</p>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                        {BASE_TOKENS.USDC.slice(0, 6)}...{BASE_TOKENS.USDC.slice(-4)}
                      </span>
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-sm font-semibold">
                        USDC
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">To</p>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                        {BASE_TOKENS.USDe.slice(0, 6)}...{BASE_TOKENS.USDe.slice(-4)}
                      </span>
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded text-sm font-semibold">
                        USDe
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Amount Input */}
              <div className="glass rounded-xl p-6 shadow-lg">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount (USDC)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="100"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Enter the amount of USDC you want to swap
                </p>
              </div>

              {/* Get Quote Button */}
              <button
                onClick={handleGetQuote}
                disabled={isLoading || !amount || parseFloat(amount) <= 0}
                className="w-full px-6 py-4 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Getting Quote...</span>
                  </>
                ) : (
                  <span>Get Swap Quote</span>
                )}
              </button>

              {/* Error Display */}
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              {/* Quote Display */}
              {quote && !isLoading && (
                <div className="glass rounded-xl p-6 shadow-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Quote Received
                    </h3>
                    <button
                      onClick={() => setShowModal(true)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Review Swap
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">You Pay</p>
                      <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
                        {parseFloat(quote.fromAmount).toFixed(2)} {quote.fromToken.symbol}
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-xs text-green-600 dark:text-green-400 mb-1">You Get</p>
                      <p className="text-xl font-bold text-green-900 dark:text-green-100">
                        {parseFloat(quote.toAmount).toFixed(4)} {quote.toToken.symbol}
                      </p>
                    </div>
                  </div>

                  <div className="text-sm space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Rate</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        1 {quote.fromToken.symbol} = {parseFloat(quote.executionPrice).toFixed(6)} {quote.toToken.symbol}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Slippage</span>
                      <span className="font-medium text-gray-900 dark:text-white">{quote.slippage}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Est. Gas</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {quote.estimatedGas.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={reset}
                    className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Clear Quote
                  </button>
                </div>
              )}

              {/* Connected Address */}
              <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                <p>Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Swap Modal */}
      <SwapPreviewModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleConfirmSwap}
        quote={quote}
        isLoading={isLoading}
        error={error}
      />
    </div>
  );
}
