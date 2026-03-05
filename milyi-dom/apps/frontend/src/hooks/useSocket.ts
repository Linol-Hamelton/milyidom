'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth-store';

// Singleton socket instance — persists across component re-renders
let socketInstance: Socket | null = null;

const FALLBACK_WS_URL = 'http://localhost:4001';
const WS_UPGRADE_BACKOFF_KEY = 'milyi-dom-ws-upgrade-backoff-until';
const CANONICAL_SOCKET_PATH = '/socket.io';
const LEGACY_SOCKET_PATH = '/api/socket.io';

const resolveWsUrl = () => {
  const explicitWsUrl = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (explicitWsUrl) {
    return explicitWsUrl;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (apiUrl) {
    try {
      return new URL(apiUrl).origin;
    } catch {
      return apiUrl.replace(/\/api\/?$/, '');
    }
  }

  return FALLBACK_WS_URL;
};

const WS_URL = resolveWsUrl();

const resolveSocketPath = (explicitPath?: string | null) => {
  if (!explicitPath) return '/socket.io';
  return explicitPath.startsWith('/') ? explicitPath : `/${explicitPath}`;
};

export const parseSocketTransports = (
  raw: string | undefined | null,
): Array<'polling' | 'websocket'> => {
  if (!raw) return ['polling'];

  const parsed = raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is 'polling' | 'websocket' => value === 'polling' || value === 'websocket');

  return parsed.length > 0 ? parsed : ['polling'];
};

const resolveSocketTransports = (): Array<'polling' | 'websocket'> =>
  parseSocketTransports(process.env.NEXT_PUBLIC_WS_TRANSPORTS?.trim());

export const parseUpgradeBackoffMinutes = (
  raw: string | undefined | null,
) => {
  const parsed = Number(raw ?? '30');
  if (!Number.isFinite(parsed) || parsed <= 0) return 30;
  return parsed;
};

const resolveUpgradeBackoffMinutes = () =>
  parseUpgradeBackoffMinutes(process.env.NEXT_PUBLIC_WS_UPGRADE_BACKOFF_MINUTES?.trim());

const getUpgradeBackoffUntil = () => {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(WS_UPGRADE_BACKOFF_KEY);
    const parsed = Number(raw ?? '0');
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
};

const isUpgradeBackoffActive = () => getUpgradeBackoffUntil() > Date.now();

const activateUpgradeBackoff = (minutes: number) => {
  if (typeof window === 'undefined') return;
  try {
    const until = Date.now() + minutes * 60 * 1000;
    window.localStorage.setItem(WS_UPGRADE_BACKOFF_KEY, String(until));
  } catch {
    // ignore storage failures
  }
};

export const isWebsocketProbeError = (message: string) => /websocket|probe error/i.test(message);
export const isSocketPathError = (message: string) => /xhr poll error|404|not found/i.test(message);

const EXPLICIT_WS_PATH = process.env.NEXT_PUBLIC_WS_PATH?.trim() ?? null;
const WS_PATH = resolveSocketPath(EXPLICIT_WS_PATH);
const WS_FALLBACK_PATH =
  WS_PATH === CANONICAL_SOCKET_PATH ? LEGACY_SOCKET_PATH : CANONICAL_SOCKET_PATH;
const HAS_EXPLICIT_WS_PATH = !!EXPLICIT_WS_PATH;
const WS_TRANSPORTS = resolveSocketTransports();
const WS_UPGRADE_BACKOFF_MINUTES = resolveUpgradeBackoffMinutes();

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
  const [socket, setSocket] = useState<Socket | null>(() => socketInstance);

  useEffect(() => {
    if (!user || !accessToken) {
      // Disconnect if user logged out
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
      }
      socketRef.current = null;
      setSocket(null);
      return;
    }

    if (socketInstance) {
      socketInstance.auth = { token: accessToken };
      if (!socketInstance.connected) {
        socketInstance.connect();
      }
      socketRef.current = socketInstance;
      setSocket(socketInstance);
      return;
    }

    const hasPollingFallback = WS_TRANSPORTS.includes('polling');
    const shouldForcePolling =
      hasPollingFallback &&
      WS_TRANSPORTS.includes('websocket') &&
      isUpgradeBackoffActive();
    const effectiveTransports: Array<'polling' | 'websocket'> = shouldForcePolling
      ? ['polling']
      : [...WS_TRANSPORTS];
    let activeSocketPath = WS_PATH;

    const socket = io(WS_URL, {
      auth: { token: accessToken },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      path: activeSocketPath,
      transports: effectiveTransports,
      upgrade: effectiveTransports.includes('websocket'),
    });

    const switchSocketPath = (reason: string) => {
      if (HAS_EXPLICIT_WS_PATH) return false;
      if (activeSocketPath === WS_FALLBACK_PATH) return false;
      activeSocketPath = WS_FALLBACK_PATH;
      socket.io.opts.path = WS_FALLBACK_PATH;
      if (socket.connected) {
        socket.disconnect();
      }
      socket.connect();
      console.warn('[WS] Switched socket path to fallback:', WS_FALLBACK_PATH, 'reason:', reason);
      return true;
    };

    const downgradeToPolling = (reason: string) => {
      if (!hasPollingFallback) return;
      const currentTransports = (socket.io.opts.transports ?? []) as string[];
      const alreadyPollingOnly =
        currentTransports.length === 1 &&
        currentTransports[0] === 'polling' &&
        socket.io.opts.upgrade === false;
      if (alreadyPollingOnly) return;

      activateUpgradeBackoff(WS_UPGRADE_BACKOFF_MINUTES);
      socket.io.opts.transports = ['polling'];
      socket.io.opts.upgrade = false;
      if (!socket.connected) {
        socket.connect();
      }
      console.warn('[WS] Downgraded to polling-only mode:', reason);
    };

    socket.on('connect', () => {
      const transport = socket.io.engine?.transport?.name;
      console.debug('[WS] Connected:', socket.id, 'transport:', transport, 'path:', activeSocketPath);
      socket.io.engine?.on('upgradeError', (err: Error) => {
        const message = err?.message ?? 'upgrade error';
        if (isWebsocketProbeError(message)) {
          downgradeToPolling(message);
        }
      });
      setSocket(socket);
    });

    socket.on('disconnect', (reason) => {
      console.debug('[WS] Disconnected:', reason);
      setSocket(socket);
    });

    socket.on('connect_error', (err) => {
      console.warn('[WS] Connection error:', err.message);
      if (isSocketPathError(err.message) && switchSocketPath(err.message)) {
        return;
      }
      if (isWebsocketProbeError(err.message)) {
        downgradeToPolling(err.message);
      }
    });

    socketInstance = socket;
    socketRef.current = socket;
    setSocket(socket);

    return () => {
      // Don't disconnect here — singleton should persist across navigations
    };
  }, [user, accessToken]);

  return socket ?? socketRef.current ?? socketInstance;
}

/**
 * Subscribe to a WebSocket event. Auto-unsubscribes on unmount.
 */
export function useSocketEvent<T = unknown>(
  event: string,
  handler: (data: T) => void,
  socketOverride?: Socket | null,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket = socketOverride ?? socketInstance;
    if (!socket) return;

    const listener = (data: T) => handlerRef.current(data);
    socket.on(event, listener);

    return () => {
      socket.off(event, listener);
    };
  }, [event, socketOverride]);
}

/**
 * Hook to send messages to a conversation.
 */
export function useSendMessage() {
  return useCallback(
    (conversationId: string, body: string, socketOverride?: Socket | null) => {
      const socket = socketOverride ?? socketInstance;
      socket?.emit(WS_EVENT.SEND_MESSAGE, { conversationId, body });
    },
    [],
  );
}

/**
 * Hook to join/leave a conversation room.
 */
export function useConversationRoom(
  conversationId: string | null,
  socketOverride?: Socket | null,
) {
  useEffect(() => {
    const socket = socketOverride ?? socketInstance;
    if (!conversationId || !socket) return;

    const join = () => {
      socket.emit(WS_EVENT.JOIN_CONVERSATION, { conversationId });
    };

    if (socket.connected) {
      join();
    }

    socket.on('connect', join);

    return () => {
      socket.off('connect', join);
      if (socket.connected) {
        socket.emit(WS_EVENT.LEAVE_CONVERSATION, { conversationId });
      }
    };
  }, [conversationId, socketOverride]);
}
