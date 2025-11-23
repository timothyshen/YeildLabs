'use client';

import { ConnectKitButton } from 'connectkit';

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
        <div className="max-w-4xl mx-auto text-center py-20">
          <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Maximize Your Stablecoin Yields
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Navigate Pendle PT/YT strategies with ease. Get AI-powered recommendations,
            one-click execution, and automated portfolio management.
          </p>
          <div className="flex gap-4 justify-center">
            <a
              href="/dashboard"
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg transition-colors"
            >
              Launch Dashboard
            </a>
            <ConnectKitButton />
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-20">
          <a href="/dashboard">
            <FeatureCard
              title="Wallet Dashboard"
              description="Overview of your assets and yields across multiple wallets"
            />
          </a>
          <a href="/portfolio">
            <FeatureCard
              title="Portfolio Manager"
              description="Manage and track all your Pendle PT/YT positions"
            />
          </a>
          <a href="/opportunities">
            <FeatureCard
              title="Opportunities"
              description="Get AI-powered recommendations and discover yield opportunities"
            />
          </a>
          <a href="/scanner">
            <FeatureCard
              title="Yield Scanner"
              description="Find the best PT/YT opportunities across all stablecoin pools"
            />
          </a>
          <a href="/strategy">
            <FeatureCard
              title="Strategy Simulator"
              description="Simulate and analyze different PT/YT yield strategies"
            />
          </a>
          <FeatureCard
            title="Auto-Roll"
            description="Automatically roll your PT positions before maturity (Coming Soon)"
          />
        </div>
      </div>
    </main>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  );
}
