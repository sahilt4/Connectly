import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useSocket } from '../../context/SocketContext';
import { Avatar } from '../common/Avatar';
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
  MessageSquare,
  UserPlus,
  UserCheck,
  Heart,
  PhoneMissed,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const NotificationDropdown = ({ isOpen, onClose, onOpenUser, onStartChat }) => {
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Listen for real-time notifications
  useEffect(() => {
    if (!socket) return;

    const handleNotification = (notif) => {
      setUnreadCount((prev) => prev + 1);
      fetchNotifications();
    };

    socket.on('notification_received', handleNotification);
    return () => socket.off('notification_received', handleNotification);
  }, [socket]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAll = async () => {
    try {
      await api.delete('/notifications');
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const renderIcon = (type) => {
    switch (type) {
      case 'connection_request':
        return <UserPlus className="w-4 h-4 text-indigo-500" />;
      case 'connection_accepted':
        return <UserCheck className="w-4 h-4 text-emerald-500" />;
      case 'story_reaction':
        return <Heart className="w-4 h-4 text-rose-500 fill-current" />;
      case 'call_missed':
        return <PhoneMissed className="w-4 h-4 text-rose-500" />;
      default:
        return <MessageSquare className="w-4 h-4 text-emerald-500" />;
    }
  };

  return (
    <div className="absolute top-16 right-4 sm:right-16 z-50 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[500px] animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-emerald-500" />
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">
              {unreadCount} new
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {notifications.length > 0 && (
            <>
              <button
                onClick={handleMarkAllAsRead}
                className="p-1 rounded-lg text-slate-400 hover:text-emerald-500"
                title="Mark all as read"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
              <button
                onClick={handleClearAll}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-500"
                title="Clear all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {notifications.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-12">
            No notifications right now
          </p>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif._id}
              onClick={() => {
                handleMarkAsRead(notif._id);
                if (notif.sender) onOpenUser && onOpenUser(notif.sender);
              }}
              className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                notif.read
                  ? 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 opacity-80'
                  : 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-500/20 shadow-xs'
              }`}
            >
              <div className="mt-0.5">{renderIcon(notif.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {notif.title}
                </p>
                {notif.body && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {notif.body}
                  </p>
                )}
                <span className="text-[9px] text-slate-400 mt-1 block">
                  {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                </span>
              </div>
              {!notif.read && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
