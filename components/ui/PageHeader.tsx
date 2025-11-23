'use client';

import Link from 'next/link';
import { ConnectKitButton } from 'connectkit';
import { ReactNode } from 'react';
import { NetworkBadge } from './NetworkBadge';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  showNavigation?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  showNavigation = true,
}: PageHeaderProps) {
  return (
    <header className="flex items-center justify-between mb-8">
      <div>
        <Link
          href="/"
          className="text-2xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          Pendle Yield Navigator
        </Link>
        <div className="mt-1">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        {showNavigation && (
          <>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/portfolio"
              className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-medium transition-colors"
            >
              Portfolio
            </Link>
            <Link
              href="/scanner"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Scanner
            </Link>
            <Link
              href="/opportunities"
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
            >
              Opportunities
            </Link>
            <Link
              href="/strategy"
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              Strategy
            </Link>
          </>
        )}
        {actions}
        <NetworkBadge />
        <ConnectKitButton />
      </div>
    </header>
  );
}

