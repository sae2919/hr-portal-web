'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Bell, Calendar, CheckCircle2, XCircle,
  Cake, Star, AlertCircle, IndianRupee,
  Loader2, RefreshCw, X,
} from 'lucide-react';
import { notificationService, Notification } from '@/services/notificationService';

// ── Icon map ──────────────────────────────────────────────────────────────────

function NotifIcon({ icon, color }: { icon: Notification['icon']; color: Notification['color'] }) {
  const iconMap = {
    calendar: Calendar,
    check:    CheckCircle2,
    x:        XCircle,
    cake:     Cake,
    star:     Star,
    alert:    AlertCircle,
    rupee:    IndianRupee,
  };

  const colorMap: Record<Notification['color'], string> = {
    orange: 'bg-orange-100 text-orange-600',
    green:  'bg-emerald-100 text-emerald-600',
    red:    'bg-red-100 text-red-600',
    pink:   'bg-pink-100 text-pink-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    blue:   'bg-blue-100 text-blue-600',
  };

  const Icon = iconMap[icon] ?? Bell;
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${colorMap[color]}`}>
      <Icon size={16} />
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export function NotificationPanel() {
  const [open, setOpen]               = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]         = useState(false);
  const [readIds, setReadIds]         = useState<Set<string>>(new Set());
  const panelRef                      = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchNotifications = async () => {
    setLoading(true);
    const res = await notificationService.getAll();
    if (res.success) setNotifications(res.data);
    setLoading(false);
  };

  // Fetch on mount (for the red dot indicator)
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Fetch on open
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open]);

  // ── Close on outside click ────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const markAllRead = () => {
    setReadIds(new Set(notifications.map(n => n.id)));
  };

  const markRead = (id: string) => {
    setReadIds(prev => new Set([...prev, id]));
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative" ref={panelRef}>

      {/* Bell Button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white px-0.5 leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-xs bg-red-100 text-red-600 font-semibold px-1.5 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 transition"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={fetchNotifications}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                title="Refresh"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Loader2 size={20} className="animate-spin text-blue-500" />
                <p className="text-xs text-slate-400">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                  <Bell size={20} className="text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600">All caught up!</p>
                <p className="text-xs text-slate-400">No notifications right now</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isRead = readIds.has(notif.id);
                return (
                  <div
                    key={notif.id}
                    onClick={() => markRead(notif.id)}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-slate-50 ${
                      isRead ? 'opacity-60' : ''
                    }`}
                  >
                    <NotifIcon icon={notif.icon} color={notif.color} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs font-semibold text-slate-800 leading-snug ${!isRead ? '' : 'font-medium'}`}>
                          {notif.title}
                        </p>
                        {!isRead && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{notif.message}</p>
                      <p className="text-[11px] text-slate-400 mt-1">{notif.time}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50">
              <p className="text-xs text-slate-400 text-center">
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}