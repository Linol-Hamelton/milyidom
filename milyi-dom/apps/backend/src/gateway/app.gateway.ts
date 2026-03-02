import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import {
  WS_EVENT,
  type SendMessagePayload,
  type JoinConversationPayload,
  type TypingPayload,
  type WsUser,
} from './gateway.types';

// Mirror the same ALLOWED_ORIGINS logic used in main.ts HTTP CORS config.
// Evaluated once at module load — env vars are already set at that point.
const _rawWsOrigins = process.env.ALLOWED_ORIGINS ?? '';
const _allowedWsOrigins: string[] = _rawWsOrigins
  ? _rawWsOrigins.split(',').map((o) => o.trim()).filter(Boolean)
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

@WebSocketGateway({
  cors: {
    origin: _allowedWsOrigins,
    credentials: true,
  },
  namespace: '/',
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  private readonly logger = new Logger(AppGateway.name);
  /** userId → Set of socketIds */
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ── Connection lifecycle ─────────────────────────────────────────────────────

  async handleConnection(socket: Socket) {
    try {
      const user = await this.authenticate(socket);
      if (!user) {
        socket.disconnect();
        return;
      }

      // Store user on socket for later handlers
      (socket as Socket & { user: WsUser }).user = user;

      // Join a personal room so we can push notifications directly to this user
      await socket.join(`user:${user.id}`);

      // Track socket per user
      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, new Set());
      }
      this.userSockets.get(user.id)!.add(socket.id);

      this.logger.log(`User ${user.id} connected (socket ${socket.id})`);
      this.broadcastOnlineStatus(user.id, true);
    } catch {
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    const user = (socket as Socket & { user?: WsUser }).user;
    if (!user) return;

    const sockets = this.userSockets.get(user.id);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        this.userSockets.delete(user.id);
        this.broadcastOnlineStatus(user.id, false);
      }
    }

    this.logger.log(`User ${user.id} disconnected (socket ${socket.id})`);
  }

  // ── Message events ───────────────────────────────────────────────────────────

  @SubscribeMessage(WS_EVENT.JOIN_CONVERSATION)
  async handleJoinConversation(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: JoinConversationPayload,
  ) {
    const user = this.getUser(socket);
    if (!user) return;

    // Verify user is a participant of this conversation
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: payload.conversationId,
        OR: [{ hostId: user.id }, { guestId: user.id }],
      },
    });

    if (!conversation) {
      socket.emit(WS_EVENT.ERROR, { message: 'Conversation not found' });
      return;
    }

    await socket.join(`conversation:${payload.conversationId}`);
  }

  @SubscribeMessage(WS_EVENT.LEAVE_CONVERSATION)
  async handleLeaveConversation(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: JoinConversationPayload,
  ) {
    await socket.leave(`conversation:${payload.conversationId}`);
  }

  @SubscribeMessage(WS_EVENT.SEND_MESSAGE)
  async handleSendMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: SendMessagePayload,
  ) {
    const user = this.getUser(socket);
    if (!user) return;

    // Verify conversation and get recipient
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: payload.conversationId,
        OR: [{ hostId: user.id }, { guestId: user.id }],
      },
    });

    if (!conversation) {
      socket.emit(WS_EVENT.ERROR, { message: 'Conversation not found' });
      return;
    }

    const recipientId =
      conversation.hostId === user.id ? conversation.guestId : conversation.hostId;

    // Persist to DB
    const message = await this.prisma.message.create({
      data: {
        conversationId: payload.conversationId,
        senderId: user.id,
        recipientId,
        body: payload.body.trim(),
      },
      include: {
        sender: {
          select: { id: true, email: true, profile: { select: { firstName: true, avatarUrl: true } } },
        },
      },
    });

    // Broadcast to everyone in the conversation room
    this.server
      .to(`conversation:${payload.conversationId}`)
      .emit(WS_EVENT.MESSAGE, message);

    // Also push to recipient's personal room (for notification badge)
    this.server.to(`user:${recipientId}`).emit(WS_EVENT.NOTIFICATION, {
      type: 'MESSAGE',
      title: 'Новое сообщение',
      body: payload.body.slice(0, 100),
      data: { conversationId: payload.conversationId },
    });
  }

  @SubscribeMessage(WS_EVENT.MARK_READ)
  async handleMarkRead(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { conversationId: string },
  ) {
    const user = this.getUser(socket);
    if (!user) return;

    await this.prisma.message.updateMany({
      where: {
        conversationId: payload.conversationId,
        recipientId: user.id,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    socket
      .to(`conversation:${payload.conversationId}`)
      .emit(WS_EVENT.MESSAGE_READ, { conversationId: payload.conversationId, userId: user.id });
  }

  @SubscribeMessage(WS_EVENT.TYPING_START)
  handleTypingStart(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: TypingPayload,
  ) {
    const user = this.getUser(socket);
    if (!user) return;
    socket
      .to(`conversation:${payload.conversationId}`)
      .emit(WS_EVENT.TYPING_START, { userId: user.id, conversationId: payload.conversationId });
  }

  @SubscribeMessage(WS_EVENT.TYPING_STOP)
  handleTypingStop(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: TypingPayload,
  ) {
    const user = this.getUser(socket);
    if (!user) return;
    socket
      .to(`conversation:${payload.conversationId}`)
      .emit(WS_EVENT.TYPING_STOP, { userId: user.id, conversationId: payload.conversationId });
  }

  // ── Public API (used from services to push server-side notifications) ────────

  /**
   * Push a real-time notification to a specific user across all their sockets.
   */
  pushNotification(userId: string, notification: {
    type: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }) {
    this.server.to(`user:${userId}`).emit(WS_EVENT.NOTIFICATION, notification);
  }

  isOnline(userId: string): boolean {
    return (this.userSockets.get(userId)?.size ?? 0) > 0;
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async authenticate(socket: Socket): Promise<WsUser | null> {
    try {
      const token =
        (socket.handshake.auth as Record<string, string>)?.token ??
        socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) return null;

      const secret = this.config.get<string>('jwt.secret')!;
      const payload = this.jwtService.verify<{ sub: string; email: string; role: string }>(
        token,
        { secret },
      );

      return { id: payload.sub, email: payload.email, role: payload.role };
    } catch {
      return null;
    }
  }

  private getUser(socket: Socket): WsUser | null {
    return (socket as Socket & { user?: WsUser }).user ?? null;
  }

  private broadcastOnlineStatus(userId: string, online: boolean) {
    // Broadcast to all — clients can filter for relevant users
    this.server.emit(WS_EVENT.ONLINE_STATUS, { userId, online });
  }
}
