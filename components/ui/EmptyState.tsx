'use client';

import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: string | ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700 ${className}`}
    >
      {icon && (
        <div className="text-6xl mb-4">
          {typeof icon === 'string' ? icon : icon}
        </div>
      )}
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
            action.variant === 'secondary'
              ? 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

