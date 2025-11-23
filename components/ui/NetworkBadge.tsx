'use client';

import { useChainId, useAccount } from 'wagmi';
import { base } from 'viem/chains';

const CHAIN_INFO: Record<number, { name: string; color: string; icon?: string }> = {
  8453: {
    name: 'Base',
    color: 'bg-blue-500',
  },
  1: {
    name: 'Ethereum',
    color: 'bg-gray-500',
  },
  42161: {
    name: 'Arbitrum',
    color: 'bg-blue-600',
  },
  137: {
    name: 'Polygon',
    color: 'bg-purple-500',
  },
  10: {
    name: 'Optimism',
    color: 'bg-red-500',
  },
};

export function NetworkBadge() {
  const chainId = useChainId();
  const { isConnected } = useAccount();

  if (!isConnected) {
    return null;
  }

  const chainInfo = CHAIN_INFO[chainId] || {
    name: `Chain ${chainId}`,
    color: 'bg-gray-500',
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
      <div className={`w-2 h-2 rounded-full ${chainInfo.color}`} />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {chainInfo.name}
      </span>
    </div>
  );
}

