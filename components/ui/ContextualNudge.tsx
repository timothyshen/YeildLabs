'use client';

import React, { memo, useState, useEffect, useCallback, createContext, useContext } from 'react';
import {
  X,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Wallet,
  Shield,
  Zap,
} from 'lucide-react';

type NudgeType = 'tip' | 'opportunity' | 'warning' | 'success' | 'feature';
type NudgePosition = 'top-right' | 'bottom-right' | 'bottom-left' | 'inline';
type NudgePriority = 'low' | 'medium' | 'high';

interface Nudge {
  id: string;
  type: NudgeType;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  priority: NudgePriority;
  dismissible?: boolean;
  duration?: number; // auto-dismiss after ms
  position?: NudgePosition;
  context?: string; // page or feature context
}

interface NudgeContextValue {
  nudges: Nudge[];
  addNudge: (nudge: Omit<Nudge, 'id'>) => string;
  removeNudge: (id: string) => void;
  clearNudges: () => void;
  dismissedNudges: Set<string>;
  permanentlyDismiss: (id: string) => void;
}

const NudgeContext = createContext<NudgeContextValue | undefined>(undefined);

const DISMISSED_STORAGE_KEY = 'pendle-dismissed-nudges';

export function NudgeProvider({ children }: { children: React.ReactNode }) {
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [dismissedNudges, setDismissedNudges] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = localStorage.getItem(DISMISSED_STORAGE_KEY);
    if (stored) {
      try {
        setDismissedNudges(new Set(JSON.parse(stored)));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  const addNudge = useCallback((nudge: Omit<Nudge, 'id'>) => {
    const id = `nudge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNudge: Nudge = { ...nudge, id };

    if (dismissedNudges.has(id)) {
      return id;
    }

    setNudges((prev) => {
      // Prevent duplicates based on title and message
      const exists = prev.some(
        (n) => n.title === nudge.title && n.message === nudge.message
      );
      if (exists) return prev;
      return [...prev, newNudge];
    });

    // Auto-dismiss if duration is set
    if (nudge.duration) {
      setTimeout(() => {
        setNudges((prev) => prev.filter((n) => n.id !== id));
      }, nudge.duration);
    }

    return id;
  }, [dismissedNudges]);

  const removeNudge = useCallback((id: string) => {
    setNudges((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearNudges = useCallback(() => {
    setNudges([]);
  }, []);

  const permanentlyDismiss = useCallback((id: string) => {
    setDismissedNudges((prev) => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
    removeNudge(id);
  }, [removeNudge]);

  return (
    <NudgeContext.Provider
      value={{
        nudges,
        addNudge,
        removeNudge,
        clearNudges,
        dismissedNudges,
        permanentlyDismiss,
      }}
    >
      {children}
    </NudgeContext.Provider>
  );
}

export function useNudges() {
  const context = useContext(NudgeContext);
  if (!context) {
    throw new Error('useNudges must be used within a NudgeProvider');
  }
  return context;
}

const NudgeCard = memo(function NudgeCard({
  nudge,
  onDismiss,
  onPermanentDismiss,
}: {
  nudge: Nudge;
  onDismiss: () => void;
  onPermanentDismiss: () => void;
}) {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(onDismiss, 200);
  };

  const getTypeStyles = () => {
    switch (nudge.type) {
      case 'tip':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/30',
          border: 'border-blue-200 dark:border-blue-800',
          icon: Lightbulb,
          iconColor: 'text-blue-600 dark:text-blue-400',
        };
      case 'opportunity':
        return {
          bg: 'bg-green-50 dark:bg-green-900/30',
          border: 'border-green-200 dark:border-green-800',
          icon: TrendingUp,
          iconColor: 'text-green-600 dark:text-green-400',
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 dark:bg-amber-900/30',
          border: 'border-amber-200 dark:border-amber-800',
          icon: AlertTriangle,
          iconColor: 'text-amber-600 dark:text-amber-400',
        };
      case 'success':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-900/30',
          border: 'border-emerald-200 dark:border-emerald-800',
          icon: Sparkles,
          iconColor: 'text-emerald-600 dark:text-emerald-400',
        };
      case 'feature':
        return {
          bg: 'bg-purple-50 dark:bg-purple-900/30',
          border: 'border-purple-200 dark:border-purple-800',
          icon: Sparkles,
          iconColor: 'text-purple-600 dark:text-purple-400',
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-800',
          border: 'border-gray-200 dark:border-gray-700',
          icon: Lightbulb,
          iconColor: 'text-gray-600 dark:text-gray-400',
        };
    }
  };

  const styles = getTypeStyles();
  const Icon = styles.icon;

  return (
    <div
      className={`p-4 rounded-xl border ${styles.bg} ${styles.border} shadow-lg transition-all duration-200 ${
        isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${styles.bg}`}>
          <Icon className={`w-5 h-5 ${styles.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
              {nudge.title}
            </h4>
            {nudge.dismissible !== false && (
              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {nudge.message}
          </p>
          {nudge.action && (
            <div className="mt-3 flex items-center gap-3">
              {nudge.action.href ? (
                <a
                  href={nudge.action.href}
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  {nudge.action.label}
                  <ChevronRight className="w-4 h-4" />
                </a>
              ) : nudge.action.onClick ? (
                <button
                  onClick={nudge.action.onClick}
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  {nudge.action.label}
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : null}
              <button
                onClick={onPermanentDismiss}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                Don't show again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// Floating nudge container for positioned nudges
export const NudgeContainer = memo(function NudgeContainer({
  position = 'bottom-right',
}: {
  position?: NudgePosition;
}) {
  const { nudges, removeNudge, permanentlyDismiss } = useNudges();

  const positionedNudges = nudges.filter(
    (n) => (n.position || 'bottom-right') === position
  );

  if (positionedNudges.length === 0) return null;

  const positionClasses = {
    'top-right': 'top-20 right-4',
    'bottom-right': 'bottom-20 right-4',
    'bottom-left': 'bottom-20 left-4',
    'inline': '',
  };

  return (
    <div
      className={`fixed ${positionClasses[position]} z-40 flex flex-col gap-3 max-w-sm`}
    >
      {positionedNudges.map((nudge) => (
        <NudgeCard
          key={nudge.id}
          nudge={nudge}
          onDismiss={() => removeNudge(nudge.id)}
          onPermanentDismiss={() => permanentlyDismiss(nudge.id)}
        />
      ))}
    </div>
  );
});

// Inline nudge for embedding in content
export const InlineNudge = memo(function InlineNudge({
  type = 'tip',
  title,
  message,
  action,
  dismissible = true,
  onDismiss,
}: {
  type?: NudgeType;
  title: string;
  message: string;
  action?: { label: string; onClick?: () => void; href?: string };
  dismissible?: boolean;
  onDismiss?: () => void;
}) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const nudge: Nudge = {
    id: 'inline',
    type,
    title,
    message,
    action,
    priority: 'medium',
    dismissible,
  };

  return (
    <NudgeCard
      nudge={nudge}
      onDismiss={handleDismiss}
      onPermanentDismiss={handleDismiss}
    />
  );
});

// Pre-built nudges for common scenarios
export const nudgeTemplates = {
  connectWallet: {
    type: 'tip' as const,
    title: 'Connect Your Wallet',
    message: 'Connect your wallet to see personalized yield recommendations based on your holdings.',
    action: { label: 'Connect Wallet' },
    priority: 'high' as const,
  },

  firstPTOpportunity: {
    type: 'opportunity' as const,
    title: 'Great PT Opportunity',
    message: 'This pool has a high PT discount - you could lock in a guaranteed return!',
    action: { label: 'Learn About PT' },
    priority: 'medium' as const,
  },

  maturingPosition: {
    type: 'warning' as const,
    title: 'Position Maturing Soon',
    message: 'You have positions expiring in the next 7 days. Consider rolling them over.',
    action: { label: 'View Positions', href: '/portfolio?filter=maturing' },
    priority: 'high' as const,
  },

  idleAssets: {
    type: 'opportunity' as const,
    title: 'Idle Assets Detected',
    message: 'You have assets sitting idle. Put them to work with Pendle yield strategies!',
    action: { label: 'Find Opportunities', href: '/opportunities' },
    priority: 'medium' as const,
  },

  newFeature: {
    type: 'feature' as const,
    title: 'New: Strategy Comparison',
    message: 'Compare multiple PT/YT strategies side by side to find the best option.',
    action: { label: 'Try It Out' },
    priority: 'low' as const,
  },

  successfulInvestment: {
    type: 'success' as const,
    title: 'Investment Successful!',
    message: 'Your investment is now active. Track it in your portfolio.',
    action: { label: 'View Portfolio', href: '/portfolio' },
    priority: 'medium' as const,
    duration: 5000,
  },

  highAPYWarning: {
    type: 'warning' as const,
    title: 'High APY - Higher Risk',
    message: 'This YT position has very high APY. Remember, actual returns depend on future yields.',
    priority: 'medium' as const,
  },
};

// Feature-specific nudge component
export const FeatureNudge = memo(function FeatureNudge({
  feature,
  children,
}: {
  feature: 'pt-discount' | 'yt-leverage' | 'split-strategy' | 'maturity';
  children: React.ReactNode;
}) {
  const [showNudge, setShowNudge] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const key = `nudge-dismissed-${feature}`;
    const dismissed = localStorage.getItem(key);
    if (!dismissed) {
      // Show nudge after a short delay
      const timer = setTimeout(() => setShowNudge(true), 2000);
      return () => clearTimeout(timer);
    } else {
      setIsDismissed(true);
    }
  }, [feature]);

  const handleDismiss = () => {
    localStorage.setItem(`nudge-dismissed-${feature}`, 'true');
    setShowNudge(false);
    setIsDismissed(true);
  };

  const nudgeContent = {
    'pt-discount': {
      icon: Shield,
      title: 'PT Discount = Your Profit',
      message: 'Buy PT at a discount, redeem at full value at maturity. The discount is your guaranteed return.',
    },
    'yt-leverage': {
      icon: Zap,
      title: 'YT Gives Leveraged Yield Exposure',
      message: 'With YT, you collect all yield from the underlying asset for a fraction of the cost.',
    },
    'split-strategy': {
      icon: TrendingUp,
      title: 'Balance Risk with Split Strategy',
      message: 'Splitting between PT and YT gives you both security and upside potential.',
    },
    'maturity': {
      icon: Clock,
      title: 'Maturity Date Matters',
      message: 'Longer maturities often have better rates, but your capital is locked longer.',
    },
  };

  const content = nudgeContent[feature];
  const Icon = content.icon;

  if (isDismissed) return <>{children}</>;

  return (
    <div className="relative">
      {children}
      {showNudge && (
        <div className="absolute z-50 top-full left-0 mt-2 w-72">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                    {content.title}
                  </h4>
                  <button
                    onClick={handleDismiss}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {content.message}
                </p>
              </div>
            </div>
            <div className="absolute -top-2 left-6 w-4 h-4 bg-white dark:bg-gray-800 border-l border-t border-gray-200 dark:border-gray-700 transform rotate-45" />
          </div>
        </div>
      )}
    </div>
  );
});

export default NudgeContainer;
