'use client';

import type { OctavPortfolio } from '@/types/octav';
import { StatCard } from '@/components/ui/StatCard';

interface PortfolioSummaryProps {
  portfolio: OctavPortfolio;
}

export function PortfolioSummary({ portfolio }: PortfolioSummaryProps) {
  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num || 0);
  };

  const networth = parseFloat(portfolio.networth || '0');
  const dailyIncome = parseFloat(portfolio.dailyIncome || '0');
  const dailyExpense = parseFloat(portfolio.dailyExpense || '0');
  const dailyPnL = dailyIncome - dailyExpense;
  const openPnL = portfolio.openPnl !== 'N/A' ? parseFloat(portfolio.openPnl || '0') : 0;
  const closedPnL = portfolio.closedPnL !== 'N/A' ? parseFloat(portfolio.closedPnL || '0') : 0;
  const feesFiat = parseFloat(portfolio.feesFiat || '0');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <StatCard
        title="Net Worth"
        value={networth}
        subtitle="Total portfolio value"
        gradient="blue"
      />
      <StatCard
        title="Daily P&L"
        value={dailyPnL}
        subtitle={`Income: ${formatCurrency(dailyIncome)} | Expense: ${formatCurrency(dailyExpense)}`}
        gradient={dailyPnL >= 0 ? 'green' : 'red'}
        trend={dailyPnL !== 0 ? {
          value: (dailyPnL / networth) * 100,
          isPositive: dailyPnL >= 0,
        } : undefined}
      />
      <StatCard
        title="Open P&L"
        value={openPnL}
        subtitle="Unrealized profit/loss"
        gradient={openPnL >= 0 ? 'green' : 'red'}
      />
      <StatCard
        title="Total Fees"
        value={feesFiat}
        subtitle="Fees paid (USD)"
        gradient="orange"
      />
    </div>
  );
}

