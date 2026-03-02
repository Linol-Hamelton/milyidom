'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth-store';

// Singleton socket instance — persists across component re-renders
let socketInstance: Socket | null = null;

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4001';

export const WS_EVENT = {
  JOIN_CONVERSATION: 'join_conversation',
  LEAVE_CONVERSATION: 'leave_conversation',
  SEND_MESSAGE: 'send_message',
  MARK_READ: 'mark_read',
  MESSAGE: 'message',
  MESSAGE_READ: 'message_read',
  NOTIFICATION: 'notification',
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  ONLINE_STATUS: 'online_status',
  ERROR: 'error',
} as const;

export function getSocket(): Socket | null {
  return socketInstance;
}

/**
 * Connect to WebSocket with JWT auth. Call once at app level (e.g. in layout).
 * Returns the socket instance — safe to call multiple times (singleton).
 */
export function useSocketConnect() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user || !accessToken) {
      // Disconnect if user logged out
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
      }
      return;
    }

    if (socketInstance?.connected) {
      socketRef.current = socketInstance;
      return;
    }

    const socket = io(WS_URL, {
      auth: { token: accessToken },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.debug('[WS] Connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.debug('[WS] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('[WS] Connection error:', err.message);
    });

    socketInstance = socket;
    socketRef.current = socket;

    return () => {
      // Don't disconnect here — singleton should persist across navigations
    };
  }, [user, accessToken]);

  return socketRef.current ?? socketInstance;
}

/**
 * Subscribe to a WebSocket event. Auto-unsubscribes on unmount.
 */
export function useSocketEvent<T = unknown>(
  event: string,
  handler: (data: T) => void,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket = socketInstance;
    if (!socket) return;

    const listener = (data: T) => handlerRef.current(data);
    socket.on(event, listener);

    return () => {
      socket.off(event, listener);
    };
  }, [event]);
}

/**
 * Hook to send messages to a conversation.
 */
export function useSendMessage() {
  return useCallback((conversationId: string, body: string) => {
    socketInstance?.emit(WS_EVENT.SEND_MESSAGE, { conversationId, body });
  }, []);
}

/**
 * Hook to join/leave a conversation room.
 */
export function useConversationRoom(conversationId: string | null) {
  useEffect(() => {
    if (!conversationId || !socketInstance) return;

    socketInstance.emit(WS_EVENT.JOIN_CONVERSATION, { conversationId });

    return () => {
      socketInstance?.emit(WS_EVENT.LEAVE_CONVERSATION, { conversationId });
    };
  }, [conversationId]);
}
