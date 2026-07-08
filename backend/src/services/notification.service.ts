import { prisma } from '../config/database';
import type { NotificationType } from '../generated/prisma/client';
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
  // First real write-side caller of this table (see ContributorApplicationService) —
  // the read endpoints (list/markRead/markAllRead) predate any code that creates rows.
  static async create(input: {
    userId: string;
    type: NotificationType;
    title: string;
    message?: string | null;
    link?: string | null;
  }): Promise<void> {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message ?? null,
        link: input.link ?? null,
      },
    });
  }

  static async list(
    userId: string,
    pagination: PaginationParams,
    unreadOnly = false,
  ): Promise<{ data: unknown[]; meta: PaginationMeta; unreadCount: number }> {
    const where = unreadOnly ? { userId, isRead: false } : { userId };

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

  static async delete(userId: string, notificationId: string): Promise<void> {
    const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notification || notification.userId !== userId) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Notification not found.');
    }

    await prisma.notification.delete({ where: { id: notificationId } });
  }
}
