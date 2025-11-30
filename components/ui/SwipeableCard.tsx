'use client';

import React, { memo, useState, useRef, useCallback, useEffect } from 'react';
import { Trash2, ChevronRight, Check, X } from 'lucide-react';

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: {
    icon?: React.ReactNode;
    label: string;
    color?: string;
  };
  rightAction?: {
    icon?: React.ReactNode;
    label: string;
    color?: string;
  };
  threshold?: number;
  className?: string;
}

export const SwipeableCard = memo(function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction = { icon: <Trash2 className="w-5 h-5" />, label: 'Delete', color: 'bg-red-500' },
  rightAction = { icon: <Check className="w-5 h-5" />, label: 'Action', color: 'bg-green-500' },
  threshold = 100,
  className = '',
}: SwipeableCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [startX, setStartX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsSwiping(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;

    // Limit the swipe distance
    const maxOffset = 150;
    const clampedOffset = Math.max(-maxOffset, Math.min(maxOffset, diff));
    setOffset(clampedOffset);
  }, [isSwiping, startX]);

  const handleTouchEnd = useCallback(() => {
    setIsSwiping(false);

    if (Math.abs(offset) >= threshold) {
      if (offset < 0 && onSwipeLeft) {
        setIsRemoving(true);
        setOffset(-300);
        setTimeout(onSwipeLeft, 200);
      } else if (offset > 0 && onSwipeRight) {
        setIsRemoving(true);
        setOffset(300);
        setTimeout(onSwipeRight, 200);
      } else {
        setOffset(0);
      }
    } else {
      setOffset(0);
    }
  }, [offset, threshold, onSwipeLeft, onSwipeRight]);

  const progress = Math.min(1, Math.abs(offset) / threshold);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-xl ${className}`}
    >
      {/* Background Actions */}
      <div className="absolute inset-0 flex">
        {/* Left action (shown when swiping right) */}
        {onSwipeRight && (
          <div
            className={`flex items-center justify-start px-6 ${rightAction.color} text-white transition-opacity`}
            style={{
              width: '50%',
              opacity: offset > 0 ? progress : 0,
            }}
          >
            <div className="flex items-center gap-2">
              {rightAction.icon}
              <span className="font-medium text-sm">{rightAction.label}</span>
            </div>
          </div>
        )}

        {/* Right action (shown when swiping left) */}
        {onSwipeLeft && (
          <div
            className={`flex items-center justify-end px-6 ml-auto ${leftAction.color} text-white transition-opacity`}
            style={{
              width: '50%',
              opacity: offset < 0 ? progress : 0,
            }}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{leftAction.label}</span>
              {leftAction.icon}
            </div>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div
        className="relative bg-white dark:bg-gray-800 touch-pan-y"
        style={{
          transform: `translateX(${offset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out, opacity 0.2s ease-out',
          opacity: isRemoving ? 0 : 1,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
});

// Swipeable list item for portfolios/positions
interface SwipeableListItemProps {
  children: React.ReactNode;
  onDelete?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  actionIcon?: React.ReactNode;
}

export const SwipeableListItem = memo(function SwipeableListItem({
  children,
  onDelete,
  onAction,
  actionLabel = 'View',
  actionIcon = <ChevronRight className="w-5 h-5" />,
}: SwipeableListItemProps) {
  return (
    <SwipeableCard
      onSwipeLeft={onDelete}
      onSwipeRight={onAction}
      leftAction={{
        icon: <Trash2 className="w-5 h-5" />,
        label: 'Delete',
        color: 'bg-red-500',
      }}
      rightAction={{
        icon: actionIcon,
        label: actionLabel,
        color: 'bg-blue-500',
      }}
    >
      {children}
    </SwipeableCard>
  );
});

// Swipeable notification/nudge
interface SwipeableNotificationProps {
  children: React.ReactNode;
  onDismiss: () => void;
}

export const SwipeableNotification = memo(function SwipeableNotification({
  children,
  onDismiss,
}: SwipeableNotificationProps) {
  return (
    <SwipeableCard
      onSwipeLeft={onDismiss}
      onSwipeRight={onDismiss}
      leftAction={{
        icon: <X className="w-5 h-5" />,
        label: 'Dismiss',
        color: 'bg-gray-500',
      }}
      rightAction={{
        icon: <X className="w-5 h-5" />,
        label: 'Dismiss',
        color: 'bg-gray-500',
      }}
      threshold={80}
    >
      {children}
    </SwipeableCard>
  );
});

export default SwipeableCard;
