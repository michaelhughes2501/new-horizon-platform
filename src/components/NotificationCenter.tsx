/**
 * Real-time Notification System
 * Provides instant updates for messages, matches, and more
 */

import React, { useState, useEffect, useCallback } from 'react';

interface Notification {
  id: string;
  type: 'message' | 'match' | 'like' | 'comment' | 'system';
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  link?: string;
  avatar?: string;
}

interface NotificationCenterProps {
  autoClose?: number; // ms
  maxNotifications?: number;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  autoClose = 5000,
  maxNotifications = 5,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Add notification
  const addNotification = useCallback(
    (
      type: Notification['type'],
      title: string,
      description: string,
      link?: string
    ) => {
      const id = Date.now().toString();
      const notification: Notification = {
        id,
        type,
        title,
        description,
        timestamp: new Date(),
        read: false,
        link,
      };

      setNotifications((prev) => [notification, ...prev].slice(0, maxNotifications));
      setUnreadCount((prev) => prev + 1);

      if (autoClose) {
        setTimeout(() => {
          removeNotification(id);
        }, autoClose);
      }
    },
    [autoClose, maxNotifications, removeNotification]
  );

  // Mark as read
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read: true } : n
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  // WebSocket connection for real-time notifications
  useEffect(() => {
    const setupWebSocket = () => {
      // Replace with your actual WebSocket endpoint
      const ws = new WebSocket(
        `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${
          window.location.host
        }/ws/notifications`
      );

      ws.onopen = () => {
        console.log('Notification WebSocket connected');
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        addNotification(data.type, data.title, data.description, data.link);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('Notification WebSocket closed');
        // Reconnect after 3 seconds
        setTimeout(setupWebSocket, 3000);
      };

      return ws;
    };

    const ws = setupWebSocket();

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [addNotification]);

  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50 max-w-sm">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
          onRead={() => markAsRead(notification.id)}
        />
      ))}

      {/* Badge */}
      {unreadCount > 0 && (
        <div className="fixed top-4 right-4 flex items-center gap-2">
          <div className="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
            {unreadCount}
          </div>
          <span className="text-sm text-gray-600">New notifications</span>
        </div>
      )}
    </div>
  );
};

interface NotificationItemProps {
  notification: Notification;
  onClose: () => void;
  onRead: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onClose,
  onRead,
}) => {
  const typeStyles = {
    message: { bg: 'bg-blue-50', border: 'border-blue-200', icon: '💬' },
    match: { bg: 'bg-red-50', border: 'border-red-200', icon: '❤️' },
    like: { bg: 'bg-purple-50', border: 'border-purple-200', icon: '👍' },
    comment: { bg: 'bg-green-50', border: 'border-green-200', icon: '💭' },
    system: { bg: 'bg-gray-50', border: 'border-gray-200', icon: 'ℹ️' },
  };

  const style = typeStyles[notification.type];

  const handleClick = () => {
    onRead();
    if (notification.link) {
      window.location.href = notification.link;
    }
  };

  return (
    <div
      className={`${style.bg} border ${style.border} rounded-lg p-4 shadow-md flex items-start gap-4 cursor-pointer hover:shadow-lg transition-shadow`}
      onClick={handleClick}
    >
      <div className="text-2xl flex-shrink-0">{style.icon}</div>

      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-gray-900 text-sm">
          {notification.title}
        </h4>
        <p className="text-gray-600 text-xs mt-1">{notification.description}</p>
        <p className="text-gray-500 text-xs mt-2">
          {formatTime(notification.timestamp)}
        </p>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600"
      >
        ✕
      </button>

      {!notification.read && (
        <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full" />
      )}
    </div>
  );
};

function formatTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

export default NotificationCenter;
