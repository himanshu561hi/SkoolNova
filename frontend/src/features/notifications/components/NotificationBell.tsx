import React, { useRef, useState, useEffect } from "react";
import { useNotificationStore } from "@/features/notification/store/notificationStore";
import { Bell, Check, Clock, X } from "lucide-react";
import NotificationBadge from "./NotificationBadge";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { notifications, fetchNotifications, getUnreadCount, markAsRead, markAllAsRead, removeNotification, clear } = useNotificationStore();
  const { user } = useAuthStore();
  
  const currentSchoolId = user?.schoolId || "school-1";
  const myNotifications = notifications.filter(n => n.schoolId === currentSchoolId);
  const unreadCount = getUnreadCount();
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Close panel on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleNotificationClick = (notif: any) => {
    markAsRead(notif.id);
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors focus:outline-none"
      >
        <Bell className="w-5 h-5" />
        <div className="absolute top-1.5 right-1.5">
          <NotificationBadge count={unreadCount} pulse={unreadCount > 0} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                Notifications
                {unreadCount > 0 && <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">{unreadCount} new</span>}
              </h3>
            </div>
            <div className="flex items-center gap-3">
              {myNotifications.length > 0 && (
                <button 
                  onClick={() => clear()}
                  className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors"
                >
                  Clear all
                </button>
              )}
              {unreadCount > 0 && (
                <button 
                  onClick={() => markAllAsRead()}
                  className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {myNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                <Bell className="w-8 h-8 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-medium">No notifications yet</p>
                <p className="text-xs mt-1 opacity-70">When you get notifications, they'll show up here.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {myNotifications.map((notif) => (
                  <div 
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`group relative p-4 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 flex gap-3 pr-10 ${
                      !notif.isRead ? 'bg-primary/5 dark:bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex-shrink-0 mt-1">
                      {!notif.isRead ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${!notif.isRead ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                        {notif.title}
                      </p>
                      <p className={`text-sm mt-0.5 line-clamp-2 ${!notif.isRead ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                        {notif.message}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNotification(notif.id);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 opacity-0 group-hover:opacity-100 transition-all duration-200"
                      title="Delete"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
