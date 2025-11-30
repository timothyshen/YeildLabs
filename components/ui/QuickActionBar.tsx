'use client';

import React, { memo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import {
  Zap,
  Clock,
  TrendingUp,
  ChevronUp,
  ChevronDown,
  Wallet,
  AlertCircle,
  ArrowRight,
  X,
} from 'lucide-react';

interface QuickAction {
  id: string;
  type: 'opportunity' | 'maturing' | 'idle';
  title: string;
  description: string;
  value?: string;
  apy?: number;
  urgency: 'low' | 'medium' | 'high';
  href: string;
  cta: string;
}

interface QuickActionBarProps {
  idleAssets?: number;
  maturingPositions?: number;
  bestAPY?: number;
  bestOpportunityPool?: string;
  onDismiss?: () => void;
}

export const QuickActionBar = memo(function QuickActionBar({
  idleAssets = 0,
  maturingPositions = 0,
  bestAPY = 0,
  bestOpportunityPool,
  onDismiss,
}: QuickActionBarProps) {
  const { isConnected } = useAccount();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [activeActionIndex, setActiveActionIndex] = useState(0);

  // Generate actions based on props
  const actions: QuickAction[] = [];

  if (idleAssets > 0) {
    actions.push({
      id: 'idle',
      type: 'idle',
      title: 'Idle Assets Detected',
      description: `You have $${idleAssets.toLocaleString()} sitting idle`,
      value: `$${idleAssets.toLocaleString()}`,
      urgency: 'medium',
      href: '/opportunities',
      cta: 'Put to Work',
    });
  }

  if (bestAPY > 0) {
    actions.push({
      id: 'opportunity',
      type: 'opportunity',
      title: 'Best Opportunity',
      description: bestOpportunityPool || 'High-yield pool available',
      apy: bestAPY,
      urgency: 'low',
      href: '/opportunities',
      cta: 'View Details',
    });
  }

  if (maturingPositions > 0) {
    actions.push({
      id: 'maturing',
      type: 'maturing',
      title: 'Positions Maturing Soon',
      description: `${maturingPositions} position${maturingPositions > 1 ? 's' : ''} expiring within 7 days`,
      urgency: 'high',
      href: '/portfolio?filter=maturing-soon',
      cta: 'Manage Now',
    });
  }

  // Rotate through actions
  useEffect(() => {
    if (actions.length <= 1) return;

    const interval = setInterval(() => {
      setActiveActionIndex((prev) => (prev + 1) % actions.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [actions.length]);

  if (!isConnected || isDismissed || actions.length === 0) {
    return null;
  }

  const activeAction = actions[activeActionIndex];

  const getUrgencyStyles = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return {
          bg: 'bg-gradient-to-r from-red-600 to-orange-600',
          icon: AlertCircle,
          pulse: true,
        };
      case 'medium':
        return {
          bg: 'bg-gradient-to-r from-amber-500 to-yellow-500',
          icon: Wallet,
          pulse: false,
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-blue-600 to-purple-600',
          icon: TrendingUp,
          pulse: false,
        };
    }
  };

  const styles = getUrgencyStyles(activeAction.urgency);
  const ActionIcon = styles.icon;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      {/* Expanded Panel */}
      {isExpanded && (
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-2xl">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Quick Actions ({actions.length})
              </h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <ChevronDown className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {actions.map((action) => {
                const actionStyles = getUrgencyStyles(action.urgency);
                const Icon = actionStyles.icon;

                return (
                  <Link
                    key={action.id}
                    href={action.href}
                    className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors group"
                  >
                    <div className={`p-2 rounded-lg ${actionStyles.bg}`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                        {action.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {action.description}
                      </p>
                    </div>
                    {action.apy && (
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">
                          {action.apy.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500">APY</p>
                      </div>
                    )}
                    {action.value && (
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {action.value}
                        </p>
                        <p className="text-xs text-gray-500">Available</p>
                      </div>
                    )}
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Collapsed Bar */}
      <div className={`${styles.bg} text-white shadow-lg`}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Left - Action Info */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              <div className={`p-1.5 bg-white/20 rounded-lg ${styles.pulse ? 'animate-pulse' : ''}`}>
                <ActionIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-medium text-sm truncate">{activeAction.title}</p>
                <p className="text-xs text-white/80 truncate">{activeAction.description}</p>
              </div>
              {actions.length > 1 && (
                <div className="flex items-center gap-1">
                  {actions.map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        i === activeActionIndex ? 'bg-white' : 'bg-white/40'
                      }`}
                    />
                  ))}
                </div>
              )}
              <ChevronUp className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            {/* Right - CTA */}
            <div className="flex items-center gap-3 ml-4">
              {activeAction.apy && (
                <div className="text-right hidden sm:block">
                  <p className="text-lg font-bold">{activeAction.apy.toFixed(1)}%</p>
                  <p className="text-xs text-white/70">APY</p>
                </div>
              )}

              <Link
                href={activeAction.href}
                className="px-4 py-2 bg-white text-gray-900 hover:bg-gray-100 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                {activeAction.cta}
              </Link>

              <button
                onClick={() => {
                  setIsDismissed(true);
                  onDismiss?.();
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default QuickActionBar;
