import type { SimulatorInput, SimulatorOutput } from '@/types';
import { calculatePTYTAllocation, calculatePTYTWithRisk, type YieldData, type RiskParams } from '@/lib/pendle/strategy';

/**
 * Calculate PT (Principal Token) simulation
 * PT has fixed yield until maturity - no APY sensitivity
 */
export function simulatePT(input: SimulatorInput): SimulatorOutput {
  const { amount, duration, expectedAPY } = input;

  // PT discount calculation
  const daysToMaturity = duration;
  const yearsToMaturity = daysToMaturity / 365;

  // Calculate PT price based on expected yield
  const impliedYield = expectedAPY / 100;
  const ptPrice = 1 / (1 + impliedYield * yearsToMaturity);

  // How many PT tokens you can buy
  const ptTokens = amount / ptPrice;

  // At maturity, each PT = 1 underlying token
  const maturityValue = ptTokens;

  // Profit
  const profit = maturityValue - amount;
  const percentageReturn = (profit / amount) * 100;

  // Annualized yield
  const apy = (percentageReturn / daysToMaturity) * 365;

  const risks = [
    'Fixed yield - Not affected by APY changes',
    'Low risk investment',
    'Guaranteed return at maturity',
    'No upside if APY increases',
  ];

  return {
    futureValue: maturityValue,
    totalYield: maturityValue - amount,
    annualizedReturn: apy,
    risks,
    riskScore: 20, // PT is low risk
    vsHolding: (maturityValue - amount) / amount * 100,
    vsCurrentAPY: 0,
  };
}

/**
 * Calculate YT (Yield Token) simulation
 * YT value depends on APY changes - high sensitivity
 */
export function simulateYT(input: SimulatorInput): SimulatorOutput {
  const { amount, duration, expectedAPY } = input;

  const daysToMaturity = duration;
  const yearsToMaturity = daysToMaturity / 365;

  // YT captures all the yield
  const dailyYield = (expectedAPY / 100) / 365;
  const totalYield = dailyYield * daysToMaturity;

  // Estimated YT price (simplified model)
  const ytPrice = totalYield;

  // How many YT tokens you can buy
  const ytTokens = amount / ytPrice;

  // Future value based on accumulated yield
  const accumulatedYield = ytTokens * totalYield;
  const futureValue = accumulatedYield;

  // Calculate APY
  const profit = futureValue - amount;
  const percentageReturn = (profit / amount) * 100;
  const apy = (percentageReturn / daysToMaturity) * 365;

  const risks = [
    'High risk - Value depends on APY changes',
    'Profits if APY increases',
    'Losses if APY decreases',
    'Volatile returns',
    'No value at maturity',
  ];

  // Generate sensitivity curve for YT
  const sensitivityCurve = generateSensitivityCurve(input);

  return {
    futureValue,
    totalYield: futureValue - amount,
    annualizedReturn: apy,
    risks,
    riskScore: 75, // YT is high risk
    sensitivityCurve,
    vsHolding: (futureValue - amount) / amount * 100,
    vsCurrentAPY: 0,
  };
}

/**
 * Generate APY sensitivity curve for YT
 * Shows how YT value changes with different APY scenarios
 */
function generateSensitivityCurve(input: SimulatorInput) {
  const { amount, duration, expectedAPY } = input;
  const curve = [];

  // Test APY from 50% below to 100% above expected
  const minAPY = expectedAPY * 0.5;
  const maxAPY = expectedAPY * 2;
  const step = (maxAPY - minAPY) / 10;

  for (let testAPY = minAPY; testAPY <= maxAPY; testAPY += step) {
    const result = simulateYT({ ...input, expectedAPY: testAPY });
    curve.push({
      apy: testAPY,
      value: result.futureValue,
    });
  }

  return curve;
}

/**
 * Main simulation function
 */
export function runSimulation(input: SimulatorInput): SimulatorOutput {
  if (input.type === 'PT') {
    return simulatePT(input);
  } else {
    return simulateYT(input);
  }
}

/**
 * Calculate risk score (0-100)
 * Higher score = higher risk
 */
export function calculateRiskScore(input: SimulatorInput): number {
  const { type, expectedAPY, duration } = input;

  let score = 0;

  // Type risk
  if (type === 'YT') {
    score += 40; // YT is inherently riskier
  } else {
    score += 10; // PT is safer
  }

  // APY risk
  if (expectedAPY > 30) {
    score += 30;
  } else if (expectedAPY > 20) {
    score += 20;
  } else if (expectedAPY > 10) {
    score += 10;
  }

  // Duration risk
  if (duration > 180) {
    score += 20;
  } else if (duration > 90) {
    score += 10;
  }

  return Math.min(score, 100);
}

/**
 * Get risk level label
 */
export function getRiskLevel(score: number): {
  label: string;
  color: string;
  description: string;
} {
  if (score >= 70) {
    return {
      label: 'High Risk',
      color: 'red',
      description: 'Significant potential for loss. Only invest what you can afford to lose.',
    };
  } else if (score >= 40) {
    return {
      label: 'Medium Risk',
      color: 'yellow',
      description: 'Moderate risk with potential for both gains and losses.',
    };
  } else {
    return {
      label: 'Low Risk',
      color: 'green',
      description: 'Relatively safe investment with predictable returns.',
    };
  }
}

/**
 * Calculate optimal PT/YT allocation using the strategy engine
 *
 * @param input Simulator input parameters
 * @param riskProfile User's risk profile (optional, defaults to 'moderate')
 * @returns Strategy result with allocation percentages and commentary
 */
export function calculateOptimalAllocation(
  input: SimulatorInput,
  riskProfile: 'conservative' | 'moderate' | 'aggressive' = 'moderate'
) {
  const { expectedAPY, duration } = input;

  // Estimate PT price based on expected yield
  const yearsToMaturity = duration / 365;
  const impliedYield = expectedAPY / 100;
  const ptPrice = 1 / (1 + impliedYield * yearsToMaturity);

  // Use strategy engine to calculate optimal allocation
  const yieldData: YieldData = {
    ptPrice,
    apy7d: expectedAPY / 100, // Current APY
    apy30d: expectedAPY / 100, // Assume stable APY for simulation
    maturityDays: duration,
    sensitivity: 1.5, // Default sensitivity for YT
  };

  // For enhanced calculation with risk adjustment
  const riskParams: RiskParams = {
    maxDrawdown: 0.1, // Assume 10% max drawdown
    volatility: 0.15, // Assume 15% volatility
    riskProfile,
  };

  // Calculate allocation with risk adjustment
  const strategy = calculatePTYTWithRisk(yieldData, riskParams);

  return {
    ptPercentage: Math.round(strategy.ptPercentage * 100),
    ytPercentage: Math.round(strategy.ytPercentage * 100),
    comment: strategy.comment,
    riskFactor: strategy.riskFactor ?? 0,
  };
}
