import { api } from '../lib/api-client';
import type { Conversation, Message } from '../types/api';

export async function fetchConversations() {
  const { data } = await api.get<Conversation[]>('/messages/conversations');
  return data;
}

export async function fetchConversation(conversationId: string) {
  const { data } = await api.get<Conversation>(`/messages/conversations/${conversationId}`);
  return data;
}

export async function fetchUnreadMessages() {
  const { data } = await api.get<{ unread: number }>('/messages/unread-count');
  return data;
}

export async function sendMessage(payload: {
  conversationId?: string;
  listingId?: string;
  recipientId?: string;
  body: string;
}) {
  const { data } = await api.post<Message>('/messages', payload);
  return data;
}

export async function markMessageRead(messageId: string) {
  const { data } = await api.patch<Message>(`/messages/${messageId}/read`, {});
  return data;
}

export async function markAllMessagesRead() {
  const { data } = await api.patch('/messages/read-all', {});
  return data as { success: boolean };
}
