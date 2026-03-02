// Socket event names — shared source of truth for backend and frontend
export const WS_EVENT = {
  // Client → Server
  JOIN_CONVERSATION: 'join_conversation',
  LEAVE_CONVERSATION: 'leave_conversation',
  SEND_MESSAGE: 'send_message',
  MARK_READ: 'mark_read',

  // Server → Client
  MESSAGE: 'message',
  MESSAGE_READ: 'message_read',
  NOTIFICATION: 'notification',
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  ONLINE_STATUS: 'online_status',
  ERROR: 'error',
} as const;

export interface SendMessagePayload {
  conversationId: string;
  body: string;
}

export interface JoinConversationPayload {
  conversationId: string;
}

export interface TypingPayload {
  conversationId: string;
}

export interface WsUser {
  id: string;
  email: string;
  role: string;
}
