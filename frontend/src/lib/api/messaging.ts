import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse, ResponseMeta } from '@/types/api';
import type { Conversation, Message } from '@/types/messaging';

export interface ListConversationsResult {
  data: Conversation[];
  meta: ResponseMeta;
}

export async function listConversations(params: { page?: number; limit?: number } = {}): Promise<ListConversationsResult> {
  const response = await apiClient.get<ApiSuccessResponse<Conversation[]>>('/messages/conversations', { params });
  return { data: response.data.data, meta: response.data.meta ?? {} };
}

export async function getUnreadMessageCount(): Promise<number> {
  const response = await apiClient.get<ApiSuccessResponse<{ unread_count: number }>>('/messages/unread-count');
  return response.data.data.unread_count;
}

export interface ListMessagesResult {
  data: Message[];
  meta: ResponseMeta;
}

export async function getConversationMessages(
  conversationId: string,
  params: { page?: number; limit?: number } = {},
): Promise<ListMessagesResult> {
  const response = await apiClient.get<ApiSuccessResponse<Message[]>>(
    `/messages/conversations/${conversationId}/messages`,
    { params },
  );
  return { data: response.data.data, meta: response.data.meta ?? {} };
}

export async function sendMessageToUser(username: string, content: string): Promise<Message> {
  const response = await apiClient.post<ApiSuccessResponse<Message>>(`/messages/to/${encodeURIComponent(username)}`, {
    content,
  });
  return response.data.data;
}

export async function sendMessageInConversation(conversationId: string, content: string): Promise<Message> {
  const response = await apiClient.post<ApiSuccessResponse<Message>>(
    `/messages/conversations/${conversationId}/messages`,
    { content },
  );
  return response.data.data;
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await apiClient.post(`/messages/conversations/${conversationId}/read`);
}

export async function blockUser(username: string): Promise<void> {
  await apiClient.post(`/users/${encodeURIComponent(username)}/block`);
}

export async function unblockUser(username: string): Promise<void> {
  await apiClient.delete(`/users/${encodeURIComponent(username)}/block`);
}
