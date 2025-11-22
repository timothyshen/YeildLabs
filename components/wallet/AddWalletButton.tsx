'use client';

import { useState } from 'react';
import { isAddress } from 'viem';

interface AddWalletButtonProps {
  onAddWallet: (address: string, label?: string) => Promise<void>;
  isLoading?: boolean;
  existingAddresses: string[];
}

type AddMethod = 'choose' | 'manual';

export function AddWalletButton({ onAddWallet, isLoading, existingAddresses }: AddWalletButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [method, setMethod] = useState<AddMethod>('choose');
  const [address, setAddress] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isAddress(address)) {
      setError('Invalid Ethereum address');
      return;
    }

    if (existingAddresses.some(addr => addr.toLowerCase() === address.toLowerCase())) {
      setError('This wallet is already added');
      return;
    }

    try {
      await onAddWallet(address, label || undefined);
      setAddress('');
      setLabel('');
      setIsOpen(false);
      setMethod('choose');
    } catch (err) {
      setError('Failed to add wallet');
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setAddress('');
    setLabel('');
    setError('');
    setMethod('choose');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
      >
        + Add Wallet
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleCancel}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Add Wallet
        </h3>

        {method === 'choose' ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              How would you like to add a wallet?
            </p>

            <button
              onClick={() => setMethod('manual')}
              className="w-full px-4 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">📝</div>
                <div>
                  <div className="font-semibold">Enter Address Manually</div>
                  <div className="text-sm opacity-90">Track any wallet by entering its address</div>
                </div>
              </div>
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  Coming soon
                </span>
              </div>
            </div>

            <button
              disabled
              className="w-full px-4 py-4 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded-lg font-medium text-left opacity-50 cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">🔗</div>
                <div>
                  <div className="font-semibold">Connect via WalletConnect</div>
                  <div className="text-sm">Authenticate with your wallet app</div>
                </div>
              </div>
            </button>

            <button
              onClick={handleCancel}
              className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors mt-4"
            >
              Cancel
            </button>
          </div>
        ) : (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Wallet Address *
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                required
                autoFocus
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Enter any Ethereum address to track (view-only)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Wallet Label (optional)
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., Trading Wallet, Cold Storage"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">
                  {error}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setMethod('choose')}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Adding...' : 'Add Wallet'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
