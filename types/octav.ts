/**
 * Octav API Response Types
 * Based on https://docs.octav.fi/api/endpoints/portfolio
 */

export interface OctavAsset {
  balance: string;
  symbol: string;
  price: string;
  value: string;
  contractAddress?: string;
  chain?: string;
}

export interface OctavProtocol {
  key: string;
  name: string;
  value: string;
  assets: OctavAsset[];
}

export interface OctavChain {
  key: string;
  name: string;
  value: string;
  protocols: string[];
}

export interface OctavPortfolio {
  address: string;
  networth: string;
  cashBalance: string;
  dailyIncome: string;
  dailyExpense: string;
  fees: string;
  feesFiat: string;
  lastUpdated: string;
  openPnl: string | 'N/A';
  closedPnl: string | 'N/A';
  totalCostBasis: string | 'N/A';
  assetByProtocols: Record<string, OctavProtocol>;
  chains: Record<string, OctavChain>;
  nftsChains?: any; // Optional, when includeNFTs=true
  nftsByCollection?: any; // Optional, when includeNFTs=true
}

export interface OctavPortfolioResponse {
  success: boolean;
  data?: OctavPortfolio;
  error?: string;
}

