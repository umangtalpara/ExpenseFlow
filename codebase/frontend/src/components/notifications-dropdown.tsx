'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { Bell, Check, CheckSquare, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

interface NotificationItem {
  _id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications?limit=8');
      const data = res.data?.data || [];
      setNotifications(data);
      const unread = data.filter((n: NotificationItem) => !n.isRead).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Set up a 15-second polling interval for real-time dynamic notifications updates
    const interval = setInterval(fetchNotifications, 15000);

    return () => clearInterval(interval);
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      {/* Bell Icon Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-800 border border-white/5 rounded-xl transition-all duration-200 focus:outline-none"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-[9px] font-bold text-slate-950 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-white/5 bg-[#0b0f19] p-4 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center">
              <Sparkles className="mr-1.5 h-3.5 w-3.5 text-cyan-400" />
              Notifications
            </h4>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center transition-colors"
              >
                <CheckSquare className="mr-1 h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          {loading && notifications.length === 0 ? (
            <div className="flex justify-center py-6">
              <RefreshCw className="h-5 w-5 animate-spin text-slate-500" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs flex flex-col items-center space-y-1">
              <AlertCircle className="h-5 w-5 text-slate-600 mb-1" />
              <span>Inbox is completely clear</span>
              <span className="text-[10px] text-slate-600">Events appear here dynamically</span>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1">
              {notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => !notif.isRead && markAsRead(notif._id)}
                  className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all duration-200 ${
                    notif.isRead
                      ? 'bg-transparent border-transparent hover:bg-white/5'
                      : 'bg-cyan-500/5 border-cyan-500/10 hover:bg-cyan-500/10'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-xs font-bold ${notif.isRead ? 'text-slate-300' : 'text-white'}`}>
                      {notif.title}
                    </span>
                    {!notif.isRead && (
                      <span className="h-2 w-2 rounded-full bg-cyan-400 flex-shrink-0 ml-2 mt-1" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{notif.body}</p>
                  <span className="text-[9px] text-slate-500 mt-1.5 block">
                    {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
