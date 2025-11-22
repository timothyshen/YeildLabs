'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import type { WalletAsset, UserPosition } from '@/types';
import type { OctavPortfolio } from '@/types/octav';

export interface ConnectedWallet {
  address: string;
  label?: string;
  isActive: boolean;
  assets: WalletAsset[];
  positions: UserPosition[];
  totalValueUSD: number;
  portfolio?: OctavPortfolio; // Full Octav portfolio data
}

export function useMultiWallet() {
  const { address: connectedAddress, isConnected } = useAccount();
  const [wallets, setWallets] = useState<ConnectedWallet[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Add connected wallet automatically (only if it's the first one)
  useEffect(() => {
    if (isConnected && connectedAddress && wallets.length === 0) {
      addWallet(connectedAddress, 'Main Wallet');
    }
  }, [connectedAddress, isConnected]);

  const addWallet = useCallback(async (address: string, label?: string) => {
    // Check if wallet already exists
    const exists = wallets.some(w => w.address.toLowerCase() === address.toLowerCase());
    if (exists) {
      // Set as active wallet
      setWallets(prev =>
        prev.map(w => ({
          ...w,
          isActive: w.address.toLowerCase() === address.toLowerCase()
        }))
      );
      return;
    }

    setIsLoading(true);
    try {
      // Fetch wallet data (mock for now, will integrate with Octav API)
      const walletData = await fetchWalletData(address);

      setWallets(prev => [
        ...prev.map(w => ({ ...w, isActive: false })),
        {
          address,
          label: label || `Wallet ${prev.length + 1}`,
          isActive: true,
          assets: walletData.assets,
          positions: walletData.positions,
          totalValueUSD: walletData.totalValueUSD,
          portfolio: walletData.portfolio,
        }
      ]);
    } catch (error) {
      console.error('Failed to add wallet:', error);
    } finally {
      setIsLoading(false);
    }
  }, [wallets]);

  const removeWallet = useCallback((address: string) => {
    setWallets(prev => prev.filter(w => w.address.toLowerCase() !== address.toLowerCase()));
  }, []);

  const setActiveWallet = useCallback((address: string) => {
    setWallets(prev =>
      prev.map(w => ({
        ...w,
        isActive: w.address.toLowerCase() === address.toLowerCase()
      }))
    );
  }, []);

  const updateWalletLabel = useCallback((address: string, label: string) => {
    setWallets(prev =>
      prev.map(w =>
        w.address.toLowerCase() === address.toLowerCase()
          ? { ...w, label }
          : w
      )
    );
  }, []);

  const refreshWallet = useCallback(async (address: string) => {
    setIsLoading(true);
    try {
      const walletData = await fetchWalletData(address);

      setWallets(prev =>
        prev.map(w =>
          w.address.toLowerCase() === address.toLowerCase()
            ? {
                ...w,
                assets: walletData.assets,
                positions: walletData.positions,
                totalValueUSD: walletData.totalValueUSD,
                portfolio: walletData.portfolio,
              }
            : w
        )
      );
    } catch (error) {
      console.error('Failed to refresh wallet:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshAllWallets = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all(wallets.map(w => refreshWallet(w.address)));
    } finally {
      setIsLoading(false);
    }
  }, [wallets, refreshWallet]);

  const activeWallet = wallets.find(w => w.isActive);
  const totalValueAllWallets = wallets.reduce((sum, w) => sum + w.totalValueUSD, 0);

  return {
    wallets,
    activeWallet,
    totalValueAllWallets,
    isLoading,
    addWallet,
    removeWallet,
    setActiveWallet,
    updateWalletLabel,
    refreshWallet,
    refreshAllWallets,
  };
}

/**
 * Fetch wallet data from Octav API
 * Falls back to mock data if API is unavailable or not configured
 */
async function fetchWalletData(address: string): Promise<{
  assets: WalletAsset[];
  positions: UserPosition[];
  totalValueUSD: number;
  portfolio?: OctavPortfolio;
}> {
  try {
    // Call our Octav API route
    const response = await fetch(`/api/octav?address=${address}&includeImages=false&waitForSync=false`);
    const result = await response.json();

    if (result.success && result.data) {
      return {
        assets: result.data.assets || [],
        positions: result.data.positions || [],
        totalValueUSD: result.data.totalValueUSD || 0,
        portfolio: result.data.portfolio, // Include full portfolio
      };
    }

    // If API call failed, fall back to mock data
    console.warn('Octav API returned unsuccessful response, using mock data');
    return getMockWalletData();
  } catch (error) {
    console.error('Failed to fetch wallet data from Octav:', error);
    // Fall back to mock data on error
    return getMockWalletData();
  }
}

/**
 * Generate mock wallet data for fallback
 */
function getMockWalletData(): {
  assets: WalletAsset[];
  positions: UserPosition[];
  totalValueUSD: number;
} {
  const mockAssets: WalletAsset[] = [
    {
      token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      symbol: 'USDC',
      balance: 10000 + Math.random() * 50000,
      valueUSD: 10000 + Math.random() * 50000,
    },
    {
      token: '0x4200000000000000000000000000000000000006',
      symbol: 'WETH',
      balance: 1 + Math.random() * 5,
      valueUSD: (1 + Math.random() * 5) * 3500,
    },
  ];

  const mockPositions: UserPosition[] = [
    {
      pool: 'PT-sUSDe-26DEC2024',
      ptBalance: 5000 + Math.random() * 10000,
      ytBalance: 0,
      syBalance: 0,
      lpBalance: 0,
      maturityValue: 5200 + Math.random() * 10500,
      costBasis: 5000 + Math.random() * 10000,
      currentValue: 4950 + Math.random() * 10200,
      realizedPnL: 0,
      unrealizedPnL: -50 + Math.random() * 200,
    },
  ];

  const totalValueUSD = mockAssets.reduce((sum, a) => sum + a.valueUSD, 0) +
    mockPositions.reduce((sum, p) => sum + p.currentValue, 0);

  return {
    assets: mockAssets,
    positions: mockPositions,
    totalValueUSD,
  };
}
