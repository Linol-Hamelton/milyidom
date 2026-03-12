import { apiClient } from '../api/client';

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

export interface ConversationUser {
  id: string;
  email: string;
  profile?: UserProfile;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  body: string;
  sentAt: string;
  readAt: string | null;
  sender: ConversationUser;
  recipient: ConversationUser;
}

export interface ConversationListing {
  id: string;
  title: string;
  images: Array<{ url: string; isPrimary: boolean }>;
}

export interface Conversation {
  id: string;
  listingId: string;
  hostId: string;
  guestId: string;
  updatedAt: string;
  messages: Message[];
  listing: ConversationListing;
  host: ConversationUser;
  guest: ConversationUser;
}

export interface ConversationDetail extends Conversation {
  messages: Message[];
}

interface ConversationsResponse {
  items: Conversation[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export const fetchConversations = async (page = 1, limit = 20): Promise<Conversation[]> => {
  const { data } = await apiClient.get<ConversationsResponse>('/messages/conversations', {
    params: { page, limit },
  });
  return data.items;
};

export const fetchConversation = async (conversationId: string): Promise<ConversationDetail> => {
  const { data } = await apiClient.get<ConversationDetail>(`/messages/conversations/${conversationId}`);
  return data;
};

export const sendMessage = async (conversationId: string, body: string): Promise<Message> => {
  const { data } = await apiClient.post<Message>('/messages', { conversationId, body });
  return data;
};

export const getUnreadCount = async (): Promise<number> => {
  const { data } = await apiClient.get<{ unread: number }>('/messages/unread-count');
  return data.unread;
};

export const markMessageRead = async (messageId: string): Promise<void> => {
  await apiClient.patch(`/messages/${messageId}/read`);
};

export const markAllMessagesRead = async (): Promise<void> => {
  await apiClient.patch('/messages/read-all');
};
