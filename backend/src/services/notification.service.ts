import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import type { PaginationMeta, PaginationParams } from '../utils/pagination';
import { buildPaginationMeta } from '../utils/pagination';

function toNotificationDto(notification: {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: Date;
  readAt: Date | null;
}): Record<string, unknown> {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    link: notification.link,
    is_read: notification.isRead,
    created_at: notification.createdAt,
    read_at: notification.readAt,
  };
}

export class NotificationService {
  static async list(
    userId: string,
    pagination: PaginationParams,
  ): Promise<{ data: unknown[]; meta: PaginationMeta; unreadCount: number }> {
    const where = { userId };

    const [total, unreadCount, notifications] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
    ]);

    return {
      data: notifications.map(toNotificationDto),
      meta: buildPaginationMeta(total, pagination),
      unreadCount,
    };
  }

  static async markRead(userId: string, notificationId: string): Promise<void> {
    const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notification || notification.userId !== userId) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Notification not found.');
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  static async markAllRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }
}
