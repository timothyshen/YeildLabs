'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { ConnectKitButton } from 'connectkit';
import {
  LayoutDashboard,
  Briefcase,
  Search,
  Calculator,
  RefreshCw,
  ArrowRight,
  Clock,
} from 'lucide-react';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href?: string;
  comingSoon?: boolean;
}

const FeatureCard = memo(function FeatureCard({
  title,
  description,
  icon,
  href,
  comingSoon = false,
}: FeatureCardProps) {
  const content = (
    <div
      className={`
        relative bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md
        transition-all duration-200 h-full
        ${comingSoon
          ? 'opacity-75 cursor-not-allowed'
          : 'hover:shadow-lg hover:scale-[1.02] cursor-pointer'
        }
      `}
    >
      {comingSoon && (
        <span className="absolute top-3 right-3 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-full flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Coming Soon
        </span>
      )}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
        </div>
        {!comingSoon && (
          <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-1" />
        )}
      </div>
    </div>
  );

  if (comingSoon || !href) {
    return content;
  }

  return <Link href={href}>{content}</Link>;
});

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Pendle Yield Navigator
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              One-stop solution for stablecoin yield strategies on Base
            </p>
          </div>
          <ConnectKitButton />
        </header>

        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center py-16 md:py-20">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Maximize Your Stablecoin Yields
          </h2>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Navigate Pendle PT/YT strategies with ease. Get AI-powered recommendations,
            one-click execution, and automated portfolio management.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg transition-colors inline-flex items-center justify-center gap-2"
            >
              Launch Dashboard
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/opportunities"
              className="px-8 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-lg font-semibold text-lg transition-colors inline-flex items-center justify-center gap-2"
            >
              Explore Opportunities
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mt-12">
          <FeatureCard
            title="Wallet Dashboard"
            description="Overview of your assets and yields across multiple wallets"
            icon={<LayoutDashboard className="w-6 h-6" />}
            href="/dashboard"
          />
          <FeatureCard
            title="Portfolio Manager"
            description="Manage and track all your Pendle PT/YT positions"
            icon={<Briefcase className="w-6 h-6" />}
            href="/portfolio"
          />
          <FeatureCard
            title="Opportunities"
            description="AI recommendations and market scanner in one place"
            icon={<Search className="w-6 h-6" />}
            href="/opportunities"
          />
          <FeatureCard
            title="Strategy Simulator"
            description="Simulate and analyze different PT/YT yield strategies"
            icon={<Calculator className="w-6 h-6" />}
            href="/strategy"
          />
          <FeatureCard
            title="Auto-Roll"
            description="Automatically roll your PT positions before maturity"
            icon={<RefreshCw className="w-6 h-6" />}
            comingSoon
          />
        </div>

        {/* Stats Section */}
        <div className="max-w-4xl mx-auto mt-20 mb-8">
          <div className="grid grid-cols-3 gap-4 md:gap-8 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">
                Base
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Network</p>
            </div>
            <div className="text-center border-x border-gray-200 dark:border-gray-700">
              <p className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">
                PT/YT
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Strategies</p>
            </div>
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-purple-600 dark:text-purple-400">
                1-Click
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Execution</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
