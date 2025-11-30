'use client';

import React, { memo, useState, useRef, useEffect } from 'react';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Trash2,
  Settings,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import { useNotifications } from '@/lib/hooks/useNotifications';
import type { Notification, NotificationType } from '@/lib/notifications/notificationService';

const NotificationIcon = memo(function NotificationIcon({
  type,
}: {
  type: NotificationType;
}) {
  const iconProps = { className: 'w-5 h-5' };

  switch (type) {
    case 'success':
      return <CheckCircle {...iconProps} className="w-5 h-5 text-green-500" />;
    case 'warning':
      return <AlertTriangle {...iconProps} className="w-5 h-5 text-amber-500" />;
    case 'error':
      return <XCircle {...iconProps} className="w-5 h-5 text-red-500" />;
    case 'opportunity':
      return <TrendingUp {...iconProps} className="w-5 h-5 text-purple-500" />;
    default:
      return <Info {...iconProps} className="w-5 h-5 text-blue-500" />;
  }
});

const NotificationItem = memo(function NotificationItem({
  notification,
  onMarkAsRead,
  onRemove,
}: {
  notification: Notification;
  onMarkAsRead: () => void;
  onRemove: () => void;
}) {
  const timeAgo = formatTimeAgo(notification.timestamp);

  return (
    <div
      className={`p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
        !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <NotificationIcon type={notification.type} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4
              className={`text-sm ${
                notification.read
                  ? 'text-gray-700 dark:text-gray-300'
                  : 'font-semibold text-gray-900 dark:text-white'
              }`}
            >
              {notification.title}
            </h4>
            <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo}</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {notification.message}
          </p>
          {notification.action && (
            <div className="mt-2 flex items-center gap-3">
              {notification.action.href ? (
                <a
                  href={notification.action.href}
                  onClick={onMarkAsRead}
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700"
                >
                  {notification.action.label}
                  <ChevronRight className="w-4 h-4" />
                </a>
              ) : notification.action.onClick ? (
                <button
                  onClick={() => {
                    onMarkAsRead();
                    notification.action?.onClick?.();
                  }}
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700"
                >
                  {notification.action.label}
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : null}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!notification.read && (
            <button
              onClick={onMarkAsRead}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
              title="Mark as read"
            >
              <Check className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <button
            onClick={onRemove}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            title="Remove"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
});

const NotificationPreferencesPanel = memo(function NotificationPreferencesPanel({
  preferences,
  permissionStatus,
  onUpdatePreferences,
  onRequestPermission,
  onClose,
}: {
  preferences: any;
  permissionStatus: string;
  onUpdatePreferences: (prefs: any) => void;
  onRequestPermission: () => void;
  onClose: () => void;
}) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">Notification Settings</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Browser Permission */}
      {permissionStatus !== 'granted' && permissionStatus !== 'unsupported' && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
            Enable browser notifications to get alerts even when the app is in the background.
          </p>
          <button
            onClick={onRequestPermission}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700"
          >
            Enable Notifications
          </button>
        </div>
      )}

      <div className="space-y-4">
        <label className="flex items-center justify-between">
          <span className="text-sm text-gray-700 dark:text-gray-300">All Notifications</span>
          <input
            type="checkbox"
            checked={preferences.enabled}
            onChange={(e) => onUpdatePreferences({ enabled: e.target.checked })}
            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </label>

        <div className={preferences.enabled ? '' : 'opacity-50 pointer-events-none'}>
          <label className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">Maturing Positions</span>
            <input
              type="checkbox"
              checked={preferences.maturingPositions}
              onChange={(e) => onUpdatePreferences({ maturingPositions: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">New Opportunities</span>
            <input
              type="checkbox"
              checked={preferences.newOpportunities}
              onChange={(e) => onUpdatePreferences({ newOpportunities: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">Price Alerts</span>
            <input
              type="checkbox"
              checked={preferences.priceAlerts}
              onChange={(e) => onUpdatePreferences({ priceAlerts: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">Transaction Updates</span>
            <input
              type="checkbox"
              checked={preferences.transactionUpdates}
              onChange={(e) => onUpdatePreferences({ transactionUpdates: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">Sound</span>
            <input
              type="checkbox"
              checked={preferences.sound}
              onChange={(e) => onUpdatePreferences({ sound: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
        </div>
      </div>
    </div>
  );
});

export const NotificationCenter = memo(function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    preferences,
    permissionStatus,
    requestPermission,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    updatePreferences,
  } = useNotifications();

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowSettings(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
          {showSettings ? (
            <NotificationPreferencesPanel
              preferences={preferences}
              permissionStatus={permissionStatus}
              onUpdatePreferences={updatePreferences}
              onRequestPermission={requestPermission}
              onClose={() => setShowSettings(false)}
            />
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-2 text-sm text-gray-500">({unreadCount} unread)</span>
                  )}
                </h3>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      title="Mark all as read"
                    >
                      <CheckCheck className="w-4 h-4 text-gray-500" />
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={clearAll}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      title="Clear all"
                    >
                      <Trash2 className="w-4 h-4 text-gray-500" />
                    </button>
                  )}
                  <button
                    onClick={() => setShowSettings(true)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Settings"
                  >
                    <Settings className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No notifications yet</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                      We'll notify you about important updates
                    </p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={() => markAsRead(notification.id)}
                      onRemove={() => removeNotification(notification.id)}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
});

// Helper function to format time ago
function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return new Date(timestamp).toLocaleDateString();
}

// Compact notification bell for header
export const NotificationBell = memo(function NotificationBell() {
  const { unreadCount } = useNotifications();

  return (
    <div className="relative">
      <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </div>
  );
});

export default NotificationCenter;
