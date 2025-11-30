'use client';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'opportunity';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  metadata?: {
    poolAddress?: string;
    positionId?: string;
    amount?: number;
    apy?: number;
  };
}

export interface NotificationPreferences {
  enabled: boolean;
  maturingPositions: boolean;
  newOpportunities: boolean;
  priceAlerts: boolean;
  transactionUpdates: boolean;
  sound: boolean;
}

const STORAGE_KEY = 'pendle-notifications';
const PREFS_KEY = 'pendle-notification-prefs';
const MAX_NOTIFICATIONS = 50;

class NotificationService {
  private notifications: Notification[] = [];
  private preferences: NotificationPreferences = {
    enabled: true,
    maturingPositions: true,
    newOpportunities: true,
    priceAlerts: true,
    transactionUpdates: true,
    sound: false,
  };
  private listeners: Set<(notifications: Notification[]) => void> = new Set();
  private prefsListeners: Set<(prefs: NotificationPreferences) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadFromStorage();
    }
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.notifications = JSON.parse(stored);
      }

      const prefs = localStorage.getItem(PREFS_KEY);
      if (prefs) {
        this.preferences = { ...this.preferences, ...JSON.parse(prefs) };
      }
    } catch {
      // Ignore parse errors
    }
  }

  private saveToStorage() {
    try {
      // Keep only the most recent notifications
      const toSave = this.notifications.slice(0, MAX_NOTIFICATIONS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      // Ignore storage errors
    }
  }

  private savePreferences() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(this.preferences));
    } catch {
      // Ignore storage errors
    }
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener([...this.notifications]));
  }

  private notifyPrefsListeners() {
    this.prefsListeners.forEach((listener) => listener({ ...this.preferences }));
  }

  // Subscribe to notification changes
  subscribe(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.add(listener);
    listener([...this.notifications]);
    return () => this.listeners.delete(listener);
  }

  // Subscribe to preference changes
  subscribePrefs(listener: (prefs: NotificationPreferences) => void): () => void {
    this.prefsListeners.add(listener);
    listener({ ...this.preferences });
    return () => this.prefsListeners.delete(listener);
  }

  // Add a new notification
  add(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): string {
    if (!this.preferences.enabled) {
      return '';
    }

    const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: Date.now(),
      read: false,
    };

    this.notifications.unshift(newNotification);
    this.saveToStorage();
    this.notifyListeners();

    // Show browser notification if permission granted
    this.showBrowserNotification(newNotification);

    // Play sound if enabled
    if (this.preferences.sound) {
      this.playNotificationSound();
    }

    return id;
  }

  // Mark notification as read
  markAsRead(id: string) {
    const notification = this.notifications.find((n) => n.id === id);
    if (notification) {
      notification.read = true;
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  // Mark all as read
  markAllAsRead() {
    this.notifications.forEach((n) => (n.read = true));
    this.saveToStorage();
    this.notifyListeners();
  }

  // Remove a notification
  remove(id: string) {
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.saveToStorage();
    this.notifyListeners();
  }

  // Clear all notifications
  clear() {
    this.notifications = [];
    this.saveToStorage();
    this.notifyListeners();
  }

  // Get all notifications
  getAll(): Notification[] {
    return [...this.notifications];
  }

  // Get unread count
  getUnreadCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }

  // Update preferences
  updatePreferences(prefs: Partial<NotificationPreferences>) {
    this.preferences = { ...this.preferences, ...prefs };
    this.savePreferences();
    this.notifyPrefsListeners();
  }

  // Get preferences
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  // Request browser notification permission
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  // Show browser notification
  private showBrowserNotification(notification: Notification) {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      const browserNotif = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id,
        requireInteraction: notification.type === 'warning',
      });

      browserNotif.onclick = () => {
        window.focus();
        if (notification.action?.href) {
          window.location.href = notification.action.href;
        }
        browserNotif.close();
      };
    }
  }

  // Play notification sound
  private playNotificationSound() {
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore autoplay restrictions
      });
    } catch {
      // Ignore audio errors
    }
  }

  // Helper methods for common notification types
  notifyMaturingPosition(poolName: string, daysLeft: number, positionId?: string) {
    if (!this.preferences.maturingPositions) return '';

    return this.add({
      type: 'warning',
      title: 'Position Maturing Soon',
      message: `Your position in ${poolName} matures in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
      action: {
        label: 'View Position',
        href: `/portfolio?position=${positionId || ''}`,
      },
      metadata: { positionId },
    });
  }

  notifyNewOpportunity(poolName: string, apy: number, poolAddress?: string) {
    if (!this.preferences.newOpportunities) return '';

    return this.add({
      type: 'opportunity',
      title: 'New High-Yield Opportunity',
      message: `${poolName} is offering ${apy.toFixed(2)}% APY`,
      action: {
        label: 'View Opportunity',
        href: `/opportunities`,
      },
      metadata: { poolAddress, apy },
    });
  }

  notifyTransaction(status: 'pending' | 'success' | 'failed', message: string) {
    if (!this.preferences.transactionUpdates) return '';

    return this.add({
      type: status === 'success' ? 'success' : status === 'failed' ? 'error' : 'info',
      title: status === 'pending' ? 'Transaction Pending' : status === 'success' ? 'Transaction Successful' : 'Transaction Failed',
      message,
      action: {
        label: 'View Portfolio',
        href: '/portfolio',
      },
    });
  }

  notifyPriceAlert(asset: string, currentPrice: number, threshold: number, direction: 'above' | 'below') {
    if (!this.preferences.priceAlerts) return '';

    return this.add({
      type: 'info',
      title: 'Price Alert',
      message: `${asset} is now ${direction} $${threshold.toFixed(2)} (current: $${currentPrice.toFixed(2)})`,
      action: {
        label: 'View Markets',
        href: '/opportunities?tab=scanner',
      },
    });
  }
}

// Singleton instance
export const notificationService = new NotificationService();

export default notificationService;
