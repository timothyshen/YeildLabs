import type { UserPosition, WalletAsset } from '@/types';

export interface YieldMetrics {
  dailyYield: number;
  weeklyYield: number;
  monthlyYield: number;
  projectedAnnual: number;
  weightedAPY: number;
}

export interface AllocationItem {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

export interface PerformanceDataPoint {
  date: string;
  value: number;
}

export function calculateYieldMetrics(
  positions: UserPosition[],
  totalValue: number
): YieldMetrics {
  if (positions.length === 0 || totalValue === 0) {
    return {
      dailyYield: 0,
      weeklyYield: 0,
      monthlyYield: 0,
      projectedAnnual: 0,
      weightedAPY: 0,
    };
  }

  // Mock APY calculation - in production, this should come from actual pool data
  // For now, using a weighted average based on position values
  const totalPnL = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
  const totalCostBasis = positions.reduce((sum, p) => sum + p.costBasis, 0);

  // Estimate APY from current PnL (very simplified)
  const estimatedAPY = totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : 12;

  // Calculate yields
  const dailyRate = estimatedAPY / 365 / 100;
  const weeklyRate = (estimatedAPY / 52) / 100;
  const monthlyRate = (estimatedAPY / 12) / 100;

  return {
    dailyYield: totalValue * dailyRate,
    weeklyYield: totalValue * weeklyRate,
    monthlyYield: totalValue * monthlyRate,
    projectedAnnual: totalValue * (estimatedAPY / 100),
    weightedAPY: Math.max(0, estimatedAPY),
  };
}

export function calculateAllocations(
  assets: WalletAsset[],
  positions: UserPosition[]
): AllocationItem[] {
  const allocations: AllocationItem[] = [];

  // Calculate total value
  const assetsValue = assets.reduce((sum, a) => sum + a.valueUSD, 0);
  const positionsValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
  const totalValue = assetsValue + positionsValue;

  if (totalValue === 0) return [];

  // Assets allocation
  if (assetsValue > 0) {
    allocations.push({
      label: 'Liquid Assets',
      value: assetsValue,
      percentage: (assetsValue / totalValue) * 100,
      color: 'bg-blue-500',
    });
  }

  // PT allocation
  const ptValue = positions.reduce((sum, p) => {
    // Estimate PT value as proportional to balance
    const ptProportion = p.ptBalance / (p.ptBalance + p.ytBalance || 1);
    return sum + (p.currentValue * ptProportion);
  }, 0);

  if (ptValue > 0) {
    allocations.push({
      label: 'PT Positions',
      value: ptValue,
      percentage: (ptValue / totalValue) * 100,
      color: 'bg-green-500',
    });
  }

  // YT allocation
  const ytValue = positions.reduce((sum, p) => {
    const ytProportion = p.ytBalance / (p.ptBalance + p.ytBalance || 1);
    return sum + (p.currentValue * ytProportion);
  }, 0);

  if (ytValue > 0) {
    allocations.push({
      label: 'YT Positions',
      value: ytValue,
      percentage: (ytValue / totalValue) * 100,
      color: 'bg-purple-500',
    });
  }

  // SY + LP allocation
  const syLpValue = positions.reduce((sum, p) => {
    // Simplified: assume SY and LP have some value
    return sum + (p.syBalance * 0.1) + (p.lpBalance * 0.1);
  }, 0);

  if (syLpValue > 0) {
    allocations.push({
      label: 'SY & LP',
      value: syLpValue,
      percentage: (syLpValue / totalValue) * 100,
      color: 'bg-orange-500',
    });
  }

  return allocations;
}

export function generateMockPerformanceData(
  currentValue: number,
  days: number = 30
): PerformanceDataPoint[] {
  const data: PerformanceDataPoint[] = [];
  const today = new Date();

  // Generate mock data with slight upward trend and some volatility
  const startValue = currentValue * 0.85; // Started 15% lower
  const volatility = 0.03; // 3% daily volatility

  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Linear growth with random noise
    const progress = (days - i) / days;
    const growth = startValue + (currentValue - startValue) * progress;
    const noise = (Math.random() - 0.5) * 2 * volatility * currentValue;
    const value = Math.max(0, growth + noise);

    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value,
    });
  }

  return data;
}
