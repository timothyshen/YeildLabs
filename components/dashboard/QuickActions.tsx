'use client';

import Link from 'next/link';

interface QuickAction {
  label: string;
  description: string;
  icon: string;
  href?: string;
  onClick?: () => void;
  color: string;
}

interface QuickActionsProps {
  onAction?: (action: string) => void;
}

export function QuickActions({ onAction }: QuickActionsProps) {
  const actions: QuickAction[] = [
    {
      label: 'Find Best Yield',
      description: 'Scan all stablecoin pools',
      icon: '🔍',
      href: '/scanner',
      color: 'from-blue-500 to-blue-600',
    },
    {
      label: 'Buy PT/YT',
      description: 'Enter a new position',
      icon: '💰',
      onClick: () => onAction?.('buy'),
      color: 'from-green-500 to-green-600',
    },
    {
      label: 'Simulate Yield',
      description: 'Calculate future returns',
      icon: '📊',
      href: '/simulator',
      color: 'from-purple-500 to-purple-600',
    },
    {
      label: 'Auto-Roll Setup',
      description: 'Enable automatic rolling',
      icon: '🔄',
      onClick: () => onAction?.('autoroll'),
      color: 'from-orange-500 to-orange-600',
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
        Quick Actions
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {actions.map((action, index) => {
          const content = (
            <div
              className={`bg-gradient-to-br ${action.color} rounded-lg p-4 text-white cursor-pointer hover:shadow-lg transition-all transform hover:-translate-y-1`}
            >
              <div className="text-3xl mb-2">{action.icon}</div>
              <h4 className="font-bold text-lg mb-1">{action.label}</h4>
              <p className="text-sm opacity-90">{action.description}</p>
            </div>
          );

          if (action.href) {
            return (
              <Link key={index} href={action.href}>
                {content}
              </Link>
            );
          }

          return (
            <button
              key={index}
              onClick={action.onClick}
              className="text-left"
            >
              {content}
            </button>
          );
        })}
      </div>

      {/* Additional Quick Links */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/scanner"
            className="text-center py-2 px-4 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-lg transition-colors"
          >
            View All Pools
          </Link>
          <button
            onClick={() => onAction?.('history')}
            className="text-center py-2 px-4 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-lg transition-colors"
          >
            Transaction History
          </button>
        </div>
      </div>
    </div>
  );
}
