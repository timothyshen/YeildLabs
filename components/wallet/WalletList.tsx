'use client';

import { useState } from 'react';
import type { ConnectedWallet } from '@/lib/hooks/useMultiWallet';

interface WalletListProps {
  wallets: ConnectedWallet[];
  activeWallet?: ConnectedWallet;
  onSelectWallet: (address: string) => void;
  onRemoveWallet: (address: string) => void;
  onUpdateLabel: (address: string, label: string) => void;
  onRefresh: (address: string) => void;
}

export function WalletList({
  wallets,
  activeWallet,
  onSelectWallet,
  onRemoveWallet,
  onUpdateLabel,
  onRefresh,
}: WalletListProps) {
  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const handleStartEdit = (wallet: ConnectedWallet) => {
    setEditingAddress(wallet.address);
    setEditLabel(wallet.label || '');
  };

  const handleSaveEdit = (address: string) => {
    onUpdateLabel(address, editLabel);
    setEditingAddress(null);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatValue = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  if (wallets.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          No wallets connected. Add a wallet to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {wallets.map((wallet) => (
        <div
          key={wallet.address}
          className={`
            bg-white dark:bg-gray-800 rounded-xl p-4 border-2 transition-all cursor-pointer
            ${wallet.isActive
              ? 'border-blue-500 shadow-lg'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }
          `}
          onClick={() => onSelectWallet(wallet.address)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {editingAddress === wallet.address ? (
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    autoFocus
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveEdit(wallet.address);
                    }}
                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingAddress(null);
                    }}
                    className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white text-xs rounded"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {wallet.label || 'Unnamed Wallet'}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEdit(wallet);
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs"
                  >
                    ✏️
                  </button>
                </div>
              )}

              <p className="text-sm text-gray-600 dark:text-gray-400 font-mono mb-2">
                {formatAddress(wallet.address)}
              </p>

              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Total Value:</span>
                  <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                    {formatValue(wallet.totalValueUSD)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Assets:</span>
                  <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                    {wallet.assets.length}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Positions:</span>
                  <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                    {wallet.positions.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onRefresh(wallet.address)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="Refresh wallet data"
              >
                🔄
              </button>
              <button
                onClick={() => {
                  if (confirm(`Remove ${wallet.label || formatAddress(wallet.address)}?`)) {
                    onRemoveWallet(wallet.address);
                  }
                }}
                className="p-2 text-red-400 hover:text-red-600"
                title="Remove wallet"
              >
                🗑️
              </button>
            </div>
          </div>

          {wallet.isActive && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                ✓ Active Wallet
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
