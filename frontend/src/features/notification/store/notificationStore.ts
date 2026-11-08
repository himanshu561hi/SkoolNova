import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import apiClient from '@/lib/axios';
import { useAuthStore } from '@/features/auth/store/authStore';

export type NotificationType = "leave" | "homework" | "notice" | "complaint" | "message" | "attendance" | "result" | "fee" | "general";

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  details?: string;
  targetRole: 'MANAGER' | 'TEACHER' | 'STUDENT' | 'ALL';
  classId?: string;
  studentId?: string;
  createdAt: Date;
  type: NotificationType;
  isRead: boolean;
  link?: string;
  schoolId?: string;
};

type NotificationState = {
  notifications: AppNotification[];
  fetchNotifications: () => Promise<void>;
  addNotification: (notification: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) => void;
  clear: () => void;
  removeNotification: (id: string) => void;
  clearRoleNotifications: (role: string) => void;
  markAsRead: (id: string) => void;
  markModuleAsRead: (type: NotificationType) => void;
  markAllAsRead: () => void;
  getUnreadCount: () => number;
  getModuleUnreadCount: (type: NotificationType) => number;
  hasUnreadInModule: (type: NotificationType) => boolean;
};

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

const getSchoolId = (): string | undefined => {
  return useAuthStore.getState().user?.schoolId || undefined;
};

export const useNotificationStore = create<NotificationState>()(
  devtools(
    (set, get) => ({
      notifications: [],

      fetchNotifications: async () => {
        try {
          const res = await apiClient.get<{ success: boolean; data: any[] }>('/notifications');
          const mapped: AppNotification[] = res.data.data.map((n) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            type: n.type as NotificationType,
            targetRole: n.targetRole,
            classId: n.classId,
            studentId: n.studentId,
            isRead: n.isRead,
            link: n.link,
            schoolId: n.schoolId,
            createdAt: new Date(n.createdAt),
          }));
          set({ notifications: mapped });
        } catch (err) {
          console.error('Failed to fetch notifications from backend', err);
        }
      },

      addNotification: (payload: Omit<AppNotification, 'id' | 'createdAt' | 'isRead' | 'schoolId'>) => {
        const currentSchoolId = getSchoolId();
        
        const newNotification: AppNotification = {
          id: generateId(),
          createdAt: new Date(),
          isRead: false,
          schoolId: currentSchoolId,
          ...payload
        };

        // Async post to API
        apiClient.post('/notifications', {
          title: newNotification.title,
          message: newNotification.message,
          type: newNotification.type,
          targetRole: newNotification.targetRole,
          targetClassId: newNotification.classId,
          targetUserId: newNotification.studentId,
          link: newNotification.link,
          schoolId: currentSchoolId,
        }).catch(() => {});
        
        set({ notifications: [newNotification, ...get().notifications] });
      },

      clear: () => {
        const currentSchoolId = getSchoolId();
        set({ 
          notifications: get().notifications.filter(n => n.schoolId !== currentSchoolId) 
        });
      },

      removeNotification: (id: string) => {
        apiClient.delete(`/notifications/${id}`).catch(() => {});
        set({ notifications: get().notifications.filter(n => n.id !== id) });
      },

      clearRoleNotifications: (role: string) => {
        const currentSchoolId = getSchoolId();
        set({ 
          notifications: get().notifications.filter(n => n.targetRole !== role || (currentSchoolId && n.schoolId !== currentSchoolId)) 
        });
      },
      
      markAsRead: (id: string) => {
        apiClient.patch(`/notifications/${id}/read`).catch(() => {});
        set({
          notifications: get().notifications.map((n) => 
            n.id === id ? { ...n, isRead: true } : n
          )
        });
      },
      
      markModuleAsRead: (type: NotificationType) => {
        set({
          notifications: get().notifications.map((n) => 
            n.type === type ? { ...n, isRead: true } : n
          )
        });
      },
      
      markAllAsRead: () => {
        apiClient.patch('/notifications/read-all').catch(() => {});
        const currentSchoolId = getSchoolId();
        set({
          notifications: get().notifications.map((n) => 
            !currentSchoolId || n.schoolId === currentSchoolId ? { ...n, isRead: true } : n
          )
        });
      },
      
      getUnreadCount: () => {
        const currentSchoolId = getSchoolId();
        return get().notifications.filter(n => !n.isRead && (!currentSchoolId || n.schoolId === currentSchoolId)).length;
      },
      
      getModuleUnreadCount: (type: NotificationType) => {
        const currentSchoolId = getSchoolId();
        return get().notifications.filter(n => !n.isRead && n.type === type && (!currentSchoolId || n.schoolId === currentSchoolId)).length;
      },
      
      hasUnreadInModule: (type: NotificationType) => {
        return get().getModuleUnreadCount(type) > 0;
      }
    })
  )
);
