'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  notificationService,
  type Notification,
  type NotificationPreferences,
} from '@/lib/notifications/notificationService';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    notificationService.getPreferences()
  );
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>(
    'default'
  );

  useEffect(() => {
    // Subscribe to notification changes
    const unsubscribe = notificationService.subscribe(setNotifications);
    const unsubscribePrefs = notificationService.subscribePrefs(setPreferences);

    // Check browser notification permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    } else {
      setPermissionStatus('unsupported');
    }

    return () => {
      unsubscribe();
      unsubscribePrefs();
    };
  }, []);

  const requestPermission = useCallback(async () => {
    const granted = await notificationService.requestPermission();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
    return granted;
  }, []);

  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
      return notificationService.add(notification);
    },
    []
  );

  const markAsRead = useCallback((id: string) => {
    notificationService.markAsRead(id);
  }, []);

  const markAllAsRead = useCallback(() => {
    notificationService.markAllAsRead();
  }, []);

  const removeNotification = useCallback((id: string) => {
    notificationService.remove(id);
  }, []);

  const clearAll = useCallback(() => {
    notificationService.clear();
  }, []);

  const updatePreferences = useCallback((prefs: Partial<NotificationPreferences>) => {
    notificationService.updatePreferences(prefs);
  }, []);

  // Convenience methods
  const notifyMaturingPosition = useCallback(
    (poolName: string, daysLeft: number, positionId?: string) => {
      return notificationService.notifyMaturingPosition(poolName, daysLeft, positionId);
    },
    []
  );

  const notifyNewOpportunity = useCallback(
    (poolName: string, apy: number, poolAddress?: string) => {
      return notificationService.notifyNewOpportunity(poolName, apy, poolAddress);
    },
    []
  );

  const notifyTransaction = useCallback(
    (status: 'pending' | 'success' | 'failed', message: string) => {
      return notificationService.notifyTransaction(status, message);
    },
    []
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    preferences,
    permissionStatus,
    requestPermission,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    updatePreferences,
    notifyMaturingPosition,
    notifyNewOpportunity,
    notifyTransaction,
  };
}

export default useNotifications;
