'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';

// Notification types
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

// Notification item interface
export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  title?: string;
  duration?: number; // in milliseconds
  createdAt: Date;
}

// Notification context interface
interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

// Create context
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Provider props
interface NotificationProviderProps {
  children: ReactNode;
  maxNotifications?: number;
}

// Default durations for different notification types (in milliseconds)
const DEFAULT_DURATIONS: Record<NotificationType, number> = {
  info: 5000,
  success: 3000,
  warning: 5000,
  error: 8000,
};

// Generate unique ID for notifications
const generateId = () => `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Provider component
export function NotificationProvider({
  children,
  maxNotifications = 5,
}: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Add a new notification
  const addNotification = (
    notification: Omit<Notification, 'id' | 'createdAt'>
  ) => {
    const newNotification: Notification = {
      ...notification,
      id: generateId(),
      createdAt: new Date(),
      duration: notification.duration || DEFAULT_DURATIONS[notification.type],
    };

    setNotifications((prev) => {
      // If we have more than maxNotifications, remove the oldest one
      if (prev.length >= maxNotifications) {
        return [...prev.slice(1), newNotification];
      }
      return [...prev, newNotification];
    });
  };

  // Remove a notification by ID
  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Auto-remove notifications when their duration expires
  useEffect(() => {
    const timers = notifications.map((notification) => {
      return setTimeout(() => {
        removeNotification(notification.id);
      }, notification.duration);
    });

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [notifications]);

  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// Custom hook to use the notification context
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

// Convenience functions for different notification types
export function useNotify() {
  const { addNotification } = useNotifications();
  
  return {
    info: (message: string, title?: string, duration?: number) => {
      addNotification({ type: 'info', message, title, duration });
    },
    success: (message: string, title?: string, duration?: number) => {
      addNotification({ type: 'success', message, title, duration });
    },
    warning: (message: string, title?: string, duration?: number) => {
      addNotification({ type: 'warning', message, title, duration });
    },
    error: (message: string, title?: string, duration?: number) => {
      addNotification({ type: 'error', message, title, duration });
    },
  };
}
