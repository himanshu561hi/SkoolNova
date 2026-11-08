import { AppError } from '../../core/errors/app-error.js';
import { HTTP_STATUS, Role } from '../../config/constants.js';
import { CreateNotificationInput } from './notifications.schema.js';
import { Notification } from '../../models/index.js';

export class NotificationsService {
  static async listNotifications(tenantId: string | null, userRole: Role, userId: string) {
    const filter: any = {};
    if (tenantId) {
      filter.tenantId = tenantId;
    }

    if (userRole === 'SUPER_ADMIN') {
      filter.$or = [
        { targetRole: { $in: ['ALL', 'SUPER_ADMIN'] } },
        { targetUserId: userId },
      ];
    } else if (userRole === 'SCHOOL_MANAGER' || (userRole as any) === 'MANAGER' || (userRole as any) === 'PRINCIPAL' || (userRole as any) === 'DIRECTOR') {
      filter.$or = [
        { targetRole: { $in: ['ALL', 'MANAGER', 'SCHOOL_MANAGER'] } },
        { targetUserId: userId },
      ];
    } else {
      filter.$or = [
        { targetRole: 'ALL' },
        { targetRole: userRole },
        { targetUserId: userId },
      ];
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    return notifications.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      targetRole: n.targetRole,
      classId: n.targetClassId || undefined,
      studentId: n.targetUserId || undefined,
      isRead: n.isRead,
      link: n.link || undefined,
      schoolId: n.tenantId,
      createdAt: n.createdAt.toISOString(),
    }));
  }

  static async getUnreadCount(tenantId: string | null, userRole: Role, userId: string) {
    const filter: any = { isRead: false };
    if (tenantId) {
      filter.tenantId = tenantId;
    }

    if (userRole === 'SUPER_ADMIN') {
      filter.$or = [
        { targetRole: { $in: ['ALL', 'SUPER_ADMIN'] } },
        { targetUserId: userId },
      ];
    } else if (userRole === 'SCHOOL_MANAGER' || (userRole as any) === 'MANAGER' || (userRole as any) === 'PRINCIPAL' || (userRole as any) === 'DIRECTOR') {
      filter.$or = [
        { targetRole: { $in: ['ALL', 'MANAGER', 'SCHOOL_MANAGER'] } },
        { targetUserId: userId },
      ];
    } else {
      filter.$or = [
        { targetRole: 'ALL' },
        { targetRole: userRole },
        { targetUserId: userId },
      ];
    }

    const count = await Notification.countDocuments(filter);

    return { unreadCount: count };
  }

  static async createNotification(
    tenantId: string | null,
    creatorUserId: string | null,
    input: CreateNotificationInput
  ) {
    const notification = await Notification.create({
      tenantId: tenantId || null,
      title: input.title.trim(),
      message: input.message.trim(),
      type: input.type || 'general',
      targetRole: input.targetRole || 'ALL',
      targetClassId: input.targetClassId || null,
      targetUserId: input.targetUserId || null,
      link: input.link || null,
      creatorId: creatorUserId,
    });

    return {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      targetRole: notification.targetRole,
      classId: notification.targetClassId || undefined,
      studentId: notification.targetUserId || undefined,
      isRead: notification.isRead,
      link: notification.link || undefined,
      schoolId: notification.tenantId,
      createdAt: notification.createdAt.toISOString(),
    };
  }

  static async markAsRead(tenantId: string | null, notificationId: string) {
    const query: any = { _id: notificationId };
    if (tenantId) query.tenantId = tenantId;
    const notif = await Notification.findOne(query);

    if (!notif) {
      throw new AppError('Notification not found', HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
    }

    notif.isRead = true;
    await notif.save();

    return { success: true, id: notif.id, isRead: notif.isRead };
  }

  static async markAllAsRead(tenantId: string | null, userRole: Role, userId: string) {
    const filter: any = { isRead: false };
    if (tenantId) filter.tenantId = tenantId;

    if (userRole === 'SUPER_ADMIN') {
      filter.$or = [
        { targetRole: { $in: ['ALL', 'SUPER_ADMIN'] } },
        { targetUserId: userId },
      ];
    } else if (userRole === 'SCHOOL_MANAGER' || (userRole as any) === 'MANAGER' || (userRole as any) === 'PRINCIPAL' || (userRole as any) === 'DIRECTOR') {
      filter.$or = [
        { targetRole: { $in: ['ALL', 'MANAGER', 'SCHOOL_MANAGER'] } },
        { targetUserId: userId },
      ];
    } else {
      filter.$or = [
        { targetRole: 'ALL' },
        { targetRole: userRole },
        { targetUserId: userId },
      ];
    }

    await Notification.updateMany(filter, { isRead: true });

    return { success: true, message: 'All notifications marked as read' };
  }

  static async deleteNotification(tenantId: string | null, notificationId: string) {
    const query: any = { _id: notificationId };
    if (tenantId) query.tenantId = tenantId;
    const notif = await Notification.findOne(query);

    if (!notif) {
      throw new AppError('Notification not found', HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
    }

    await Notification.findByIdAndDelete(notificationId);

    return { success: true, message: 'Notification removed' };
  }
}
