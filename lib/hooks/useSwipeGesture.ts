'use client';

import { useRef, useCallback, useEffect, useState } from 'react';

interface SwipeConfig {
  threshold?: number; // Minimum distance to trigger swipe (default: 50px)
  velocityThreshold?: number; // Minimum velocity (default: 0.3)
  preventDefaultTouchmove?: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeStart?: (direction: 'left' | 'right' | 'up' | 'down') => void;
  onSwipeEnd?: () => void;
}

interface SwipeState {
  startX: number;
  startY: number;
  startTime: number;
  currentX: number;
  currentY: number;
  isSwiping: boolean;
  direction: 'left' | 'right' | 'up' | 'down' | null;
}

interface SwipeResult {
  ref: React.RefObject<HTMLDivElement>;
  isSwiping: boolean;
  direction: 'left' | 'right' | 'up' | 'down' | null;
  offset: { x: number; y: number };
  progress: number; // 0-1 progress toward threshold
}

export function useSwipeGesture(config: SwipeConfig = {}): SwipeResult {
  const {
    threshold = 50,
    velocityThreshold = 0.3,
    preventDefaultTouchmove = false,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onSwipeStart,
    onSwipeEnd,
  } = config;

  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<SwipeState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    currentX: 0,
    currentY: 0,
    isSwiping: false,
    direction: null,
  });

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    setState({
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      currentX: touch.clientX,
      currentY: touch.clientY,
      isSwiping: true,
      direction: null,
    });
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (preventDefaultTouchmove) {
      e.preventDefault();
    }

    const touch = e.touches[0];
    setState((prev) => {
      if (!prev.isSwiping) return prev;

      const deltaX = touch.clientX - prev.startX;
      const deltaY = touch.clientY - prev.startY;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      let direction: 'left' | 'right' | 'up' | 'down' | null = null;

      if (absX > absY) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }

      if (direction !== prev.direction && (absX > 10 || absY > 10)) {
        onSwipeStart?.(direction);
      }

      return {
        ...prev,
        currentX: touch.clientX,
        currentY: touch.clientY,
        direction,
      };
    });
  }, [preventDefaultTouchmove, onSwipeStart]);

  const handleTouchEnd = useCallback(() => {
    setState((prev) => {
      if (!prev.isSwiping) return prev;

      const deltaX = prev.currentX - prev.startX;
      const deltaY = prev.currentY - prev.startY;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      const duration = Date.now() - prev.startTime;
      const velocity = Math.max(absX, absY) / duration;

      const isValidSwipe = Math.max(absX, absY) >= threshold || velocity >= velocityThreshold;

      if (isValidSwipe && prev.direction) {
        switch (prev.direction) {
          case 'left':
            onSwipeLeft?.();
            break;
          case 'right':
            onSwipeRight?.();
            break;
          case 'up':
            onSwipeUp?.();
            break;
          case 'down':
            onSwipeDown?.();
            break;
        }
      }

      onSwipeEnd?.();

      return {
        startX: 0,
        startY: 0,
        startTime: 0,
        currentX: 0,
        currentY: 0,
        isSwiping: false,
        direction: null,
      };
    });
  }, [threshold, velocityThreshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onSwipeEnd]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefaultTouchmove });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, preventDefaultTouchmove]);

  const offset = {
    x: state.currentX - state.startX,
    y: state.currentY - state.startY,
  };

  const progress = Math.min(
    1,
    Math.max(Math.abs(offset.x), Math.abs(offset.y)) / threshold
  );

  return {
    ref: ref as React.RefObject<HTMLDivElement>,
    isSwiping: state.isSwiping,
    direction: state.direction,
    offset,
    progress,
  };
}

// Hook for swipeable cards (e.g., dismiss, navigate)
export function useSwipeableCard(config: {
  onDismiss?: () => void;
  onAction?: () => void;
  dismissDirection?: 'left' | 'right' | 'both';
  actionDirection?: 'left' | 'right';
}) {
  const {
    onDismiss,
    onAction,
    dismissDirection = 'left',
    actionDirection = 'right',
  } = config;

  const [offset, setOffset] = useState(0);
  const [isDismissing, setIsDismissing] = useState(false);

  const swipe = useSwipeGesture({
    threshold: 100,
    onSwipeLeft: () => {
      if (dismissDirection === 'left' || dismissDirection === 'both') {
        setIsDismissing(true);
        setOffset(-300);
        setTimeout(() => onDismiss?.(), 200);
      } else if (actionDirection === 'left') {
        onAction?.();
      }
    },
    onSwipeRight: () => {
      if (dismissDirection === 'right' || dismissDirection === 'both') {
        setIsDismissing(true);
        setOffset(300);
        setTimeout(() => onDismiss?.(), 200);
      } else if (actionDirection === 'right') {
        onAction?.();
      }
    },
    onSwipeEnd: () => {
      if (!isDismissing) {
        setOffset(0);
      }
    },
  });

  useEffect(() => {
    if (swipe.isSwiping && !isDismissing) {
      setOffset(swipe.offset.x);
    }
  }, [swipe.isSwiping, swipe.offset.x, isDismissing]);

  return {
    ref: swipe.ref,
    style: {
      transform: `translateX(${offset}px)`,
      transition: swipe.isSwiping ? 'none' : 'transform 0.2s ease-out',
      opacity: isDismissing ? 0 : 1,
    },
    isSwiping: swipe.isSwiping,
    progress: swipe.progress,
  };
}

// Hook for swipeable tabs/pages
export function useSwipeableTabs<T extends string>(
  tabs: T[],
  currentTab: T,
  onTabChange: (tab: T) => void
) {
  const currentIndex = tabs.indexOf(currentTab);

  const swipe = useSwipeGesture({
    threshold: 80,
    onSwipeLeft: () => {
      if (currentIndex < tabs.length - 1) {
        onTabChange(tabs[currentIndex + 1]);
      }
    },
    onSwipeRight: () => {
      if (currentIndex > 0) {
        onTabChange(tabs[currentIndex - 1]);
      }
    },
  });

  return {
    ref: swipe.ref,
    isSwiping: swipe.isSwiping,
    canSwipeLeft: currentIndex < tabs.length - 1,
    canSwipeRight: currentIndex > 0,
    progress: swipe.progress,
    direction: swipe.direction,
  };
}

export default useSwipeGesture;
