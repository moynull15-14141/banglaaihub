import type { Prisma } from '../generated/prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import type { PaginationMeta, PaginationParams } from '../utils/pagination';
import { buildPaginationMeta } from '../utils/pagination';
import { NotificationService } from './notification.service';
import { StorageService } from './storage.service';
import type { SendMessageInput } from '../validators/messaging.validator';

const participantSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  isVerified: true,
} satisfies Prisma.UserSelect;

async function toPublicUser(user: {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
}): Promise<Record<string, unknown>> {
  return {
    id: user.id,
    username: user.username,
    display_name: user.displayName,
    avatar_url: await StorageService.resolveAvatarUrl(user.avatarUrl),
    is_verified: user.isVerified,
  };
}

function toMessageDto(message: {
  id: string;
  conversationId: string;
  senderId: string | null;
  content: string;
  readAt: Date | null;
  createdAt: Date;
}): Record<string, unknown> {
  return {
    id: message.id,
    conversation_id: message.conversationId,
    sender_id: message.senderId,
    content: message.content,
    read_at: message.readAt,
    created_at: message.createdAt,
  };
}

// Canonical ordering means a unique(participantOneId, participantTwoId)
// constraint alone prevents duplicate conversations for the same pair —
// no need to check both (A,B) and (B,A) on lookup.
function orderPair(userAId: string, userBId: string): [string, string] {
  return userAId < userBId ? [userAId, userBId] : [userBId, userAId];
}

export class MessagingService {
  static async isBlocked(userAId: string, userBId: string): Promise<boolean> {
    const block = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: userAId, blockedId: userBId },
          { blockerId: userBId, blockedId: userAId },
        ],
      },
    });
    return Boolean(block);
  }

  static async getOrCreateConversation(userAId: string, userBId: string): Promise<{ id: string }> {
    const [participantOneId, participantTwoId] = orderPair(userAId, userBId);
    return prisma.conversation.upsert({
      where: { participantOneId_participantTwoId: { participantOneId, participantTwoId } },
      create: { participantOneId, participantTwoId },
      update: {},
      select: { id: true },
    });
  }

  static async sendMessageTo(senderId: string, recipientUsername: string, input: SendMessageInput): Promise<unknown> {
    const recipient = await prisma.user.findUnique({
      where: { username: recipientUsername },
      select: { id: true, deletedAt: true },
    });
    if (!recipient || recipient.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'User not found.');
    }
    if (recipient.id === senderId) {
      throw new ApiError(400, 'VALIDATION_ERROR', "You can't message yourself.");
    }
    if (await MessagingService.isBlocked(senderId, recipient.id)) {
      throw new ApiError(403, 'FORBIDDEN', 'You cannot message this user.');
    }

    const conversation = await MessagingService.getOrCreateConversation(senderId, recipient.id);
    return MessagingService.sendMessageIn(conversation.id, senderId, input);
  }

  static async sendMessageIn(conversationId: string, senderId: string, input: SendMessageInput): Promise<unknown> {
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Conversation not found.');
    }
    const isParticipant = conversation.participantOneId === senderId || conversation.participantTwoId === senderId;
    if (!isParticipant) {
      throw new ApiError(403, 'FORBIDDEN', 'You are not part of this conversation.');
    }

    const recipientId =
      conversation.participantOneId === senderId ? conversation.participantTwoId : conversation.participantOneId;
    if (await MessagingService.isBlocked(senderId, recipientId)) {
      throw new ApiError(403, 'FORBIDDEN', 'You cannot message this user.');
    }

    const [message] = await prisma.$transaction([
      prisma.message.create({ data: { conversationId, senderId, content: input.content } }),
      prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } }),
    ]);

    const sender = await prisma.user.findUnique({ where: { id: senderId }, select: { username: true } });
    await NotificationService.create({
      userId: recipientId,
      type: 'new_message',
      title: `New message from @${sender?.username ?? 'someone'}`,
      message: input.content.slice(0, 200),
      link: `/messages`,
    });

    return toMessageDto(message);
  }

  static async listConversations(
    userId: string,
    pagination: PaginationParams,
  ): Promise<{ data: unknown[]; meta: PaginationMeta }> {
    const where: Prisma.ConversationWhereInput = {
      OR: [{ participantOneId: userId }, { participantTwoId: userId }],
    };

    const [total, conversations] = await Promise.all([
      prisma.conversation.count({ where }),
      prisma.conversation.findMany({
        where,
        include: {
          participantOne: { select: participantSelect },
          participantTwo: { select: participantSelect },
        },
        orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
    ]);

    const conversationIds = conversations.map((c) => c.id);
    const [lastMessages, unreadCounts] = await Promise.all([
      conversationIds.length
        ? prisma.message.findMany({
            where: { conversationId: { in: conversationIds } },
            orderBy: { createdAt: 'desc' },
            distinct: ['conversationId'],
          })
        : Promise.resolve([]),
      conversationIds.length
        ? prisma.message.groupBy({
            by: ['conversationId'],
            where: { conversationId: { in: conversationIds }, readAt: null, senderId: { not: userId } },
            _count: { _all: true },
          })
        : Promise.resolve([]),
    ]);
    const lastMessageByConversation = new Map(lastMessages.map((m) => [m.conversationId, m]));
    const unreadByConversation = new Map(unreadCounts.map((row) => [row.conversationId, row._count._all]));

    const data = await Promise.all(
      conversations.map(async (c) => {
        const otherParticipant = c.participantOneId === userId ? c.participantTwo : c.participantOne;
        const lastMessage = lastMessageByConversation.get(c.id);
        return {
          id: c.id,
          other_participant: await toPublicUser(otherParticipant),
          last_message: lastMessage ? toMessageDto(lastMessage) : null,
          unread_count: unreadByConversation.get(c.id) ?? 0,
          last_message_at: c.lastMessageAt,
          created_at: c.createdAt,
        };
      }),
    );

    return { data, meta: buildPaginationMeta(total, pagination) };
  }

  static async getMessages(
    conversationId: string,
    userId: string,
    pagination: PaginationParams,
  ): Promise<{ data: unknown[]; meta: PaginationMeta }> {
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Conversation not found.');
    }
    if (conversation.participantOneId !== userId && conversation.participantTwoId !== userId) {
      throw new ApiError(403, 'FORBIDDEN', 'You are not part of this conversation.');
    }

    const where = { conversationId };
    const [total, messages] = await Promise.all([
      prisma.message.count({ where }),
      // Newest-first paged from the end of the thread, same as any chat
      // history view — page 1 is the most recent messages.
      prisma.message.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
    ]);

    return {
      data: messages.map(toMessageDto).reverse(),
      meta: buildPaginationMeta(total, pagination),
    };
  }

  static async markConversationRead(conversationId: string, userId: string): Promise<void> {
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Conversation not found.');
    }
    if (conversation.participantOneId !== userId && conversation.participantTwoId !== userId) {
      throw new ApiError(403, 'FORBIDDEN', 'You are not part of this conversation.');
    }

    await prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, readAt: null },
      data: { readAt: new Date() },
    });
  }

  static async getUnreadCount(userId: string): Promise<number> {
    return prisma.message.count({
      where: {
        readAt: null,
        senderId: { not: userId },
        conversation: { OR: [{ participantOneId: userId }, { participantTwoId: userId }] },
      },
    });
  }

  static async blockUser(blockerId: string, blockedUsername: string): Promise<void> {
    const blocked = await prisma.user.findUnique({ where: { username: blockedUsername }, select: { id: true } });
    if (!blocked) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'User not found.');
    }
    if (blocked.id === blockerId) {
      throw new ApiError(400, 'VALIDATION_ERROR', "You can't block yourself.");
    }

    await prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId: blocked.id } },
      create: { blockerId, blockedId: blocked.id },
      update: {},
    });
  }

  static async unblockUser(blockerId: string, blockedUsername: string): Promise<void> {
    const blocked = await prisma.user.findUnique({ where: { username: blockedUsername }, select: { id: true } });
    if (!blocked) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'User not found.');
    }

    await prisma.userBlock.deleteMany({ where: { blockerId, blockedId: blocked.id } });
  }
}
