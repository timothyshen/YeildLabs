'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

export function StrategyCardSkeleton() {
  return (
    <div className="p-5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <Skeleton width="70%" height={24} className="mb-2" />
          <Skeleton width="40%" height={16} />
        </div>
        <Skeleton variant="circular" width={48} height={48} />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
            <Skeleton width="50%" height={12} className="mb-2" />
            <Skeleton width="70%" height={20} />
          </div>
        ))}
      </div>

      {/* Allocation Bar */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4">
        <Skeleton width="60%" height={14} className="mb-3" />
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <Skeleton width={60} height={12} />
              <Skeleton width={60} height={12} />
            </div>
            <Skeleton height={24} className="rounded-full" />
          </div>
        </div>
      </div>

      {/* Investment Form */}
      <div className="space-y-4">
        <div>
          <Skeleton width="40%" height={14} className="mb-2" />
          <Skeleton height={48} className="rounded-lg" />
        </div>

        {/* Button */}
        <Skeleton height={56} className="rounded-lg" />
      </div>
    </div>
  );
}

export function StrategyCardSkeletonGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <StrategyCardSkeleton key={i} />
      ))}
    </div>
  );
}
