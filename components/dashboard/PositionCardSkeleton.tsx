'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

export function PositionCardSkeleton() {
  return (
    <div className="glass rounded-xl shadow-lg overflow-hidden border">
      {/* Header */}
      <div className="p-6">
        {/* Title and Value Row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <Skeleton width="60%" height={28} className="mb-1" />
            <Skeleton width="40%" height={16} />
          </div>
          <div className="text-right ml-4">
            <Skeleton width={120} height={32} className="mb-1 ml-auto" />
            <Skeleton width={90} height={18} className="ml-auto" />
          </div>
        </div>

        {/* Badges Row */}
        <div className="flex items-center gap-2 mb-4">
          <Skeleton width={80} height={28} className="rounded-full" />
          <Skeleton width={100} height={28} className="rounded-full" />
        </div>

        {/* Token Balances */}
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800/30"
            >
              <Skeleton width="50%" height={12} className="mb-2" />
              <Skeleton width="70%" height={28} className="mb-1" />
              <Skeleton width="60%" height={14} />
            </div>
          ))}
        </div>

        {/* Expand indicator */}
        <div className="flex justify-center mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Skeleton width={120} height={16} />
        </div>
      </div>
    </div>
  );
}

export function PositionCardSkeletonGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <PositionCardSkeleton key={i} />
      ))}
    </div>
  );
}
