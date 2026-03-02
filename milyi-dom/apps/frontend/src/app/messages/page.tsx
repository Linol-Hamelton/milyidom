"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { RequireAuth } from '../../components/ui/require-auth';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import {
  fetchConversations,
  fetchConversation,
  markAllMessagesRead,
} from '../../services/messages';
import type { Conversation, Message } from '../../types/api';
import { parseError } from '../../lib/api-client';
import { useAuth } from '../../hooks/useAuth';
import {
  useConversationRoom,
  useSocketEvent,
  useSendMessage,
  WS_EVENT,
  getSocket,
} from '../../hooks/useSocket';

function ConversationView({ conversationId, userId }: { conversationId: string; userId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendWs = useSendMessage();

  // Join this conversation's WebSocket room
  useConversationRoom(conversationId);

  // Load history from REST
  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchConversation(conversationId);
        setMessages(data.messages);
        // Mark as read via WebSocket
        const socket = getSocket();
        if (socket?.connected) {
          socket.emit(WS_EVENT.MARK_READ, { conversationId });
        }
      } catch (err) {
        toast.error(parseError(err).message);
      }
    };
    void load();
  }, [conversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Receive new messages via WebSocket
  useSocketEvent<Message>(WS_EVENT.MESSAGE, (msg) => {
    if (msg.conversationId !== conversationId) return;
    setMessages((prev) => {
      // Deduplicate by id
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
    // Mark read since we're in the conversation
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit(WS_EVENT.MARK_READ, { conversationId });
    }
  });

  // Typing indicators
  useSocketEvent<{ userId: string; conversationId: string }>(WS_EVENT.TYPING_START, (p) => {
    if (p.conversationId !== conversationId || p.userId === userId) return;
    setIsTyping(true);
  });
  useSocketEvent<{ userId: string; conversationId: string }>(WS_EVENT.TYPING_STOP, (p) => {
    if (p.conversationId !== conversationId || p.userId === userId) return;
    setIsTyping(false);
  });

  const emitTyping = (typing: boolean) => {
    const socket = getSocket();
    if (!socket?.connected) return;
    socket.emit(typing ? WS_EVENT.TYPING_START : WS_EVENT.TYPING_STOP, { conversationId });
  };

  const handleBodyChange = (val: string) => {
    setBody(val);
    emitTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => emitTyping(false), 2000);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      sendWs(conversationId, text);
      setBody('');
      emitTyping(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="flex min-h-[420px] flex-col gap-4 rounded-3xl bg-white p-6 shadow-soft">
      <h2 className="text-lg font-semibold text-slate-900">Переписка</h2>
      <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-100 bg-sand-50 p-4 max-h-[480px]">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500">Напишите первое сообщение.</p>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => {
              const isMine = message.senderId === userId;
              return (
                <div
                  key={message.id}
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-soft ${
                    isMine
                      ? 'ml-auto bg-pine-600 text-white'
                      : message.readAt
                      ? 'bg-white text-slate-700'
                      : 'bg-pine-50 text-pine-700'
                  }`}
                >
                  <p>{message.body}</p>
                  <span className="mt-1 block text-[11px] opacity-60">
                    {new Date(message.sentAt).toLocaleString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              );
            })}
            {isTyping && (
              <div className="flex items-center gap-1 px-4 py-2 text-xs text-slate-400">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
      <form onSubmit={handleSend} className="space-y-3">
        <Textarea
          rows={3}
          placeholder="Напишите сообщение…"
          value={body}
          onChange={(e) => handleBodyChange(e.target.value)}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={sending || !body.trim()}>
            Отправить
          </Button>
        </div>
      </form>
    </section>
  );
}

export default function MessagesPage() {
  const { user, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadConversations = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const data = await fetchConversations();
      setConversations(data);
      if (data.length > 0 && !activeId) {
        setActiveId(data[0].id);
      }
    } catch (error) {
      toast.error(parseError(error).message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, activeId]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  // When a new WS message arrives for a conversation NOT currently open,
  // refresh the sidebar to update "last updated" time.
  useSocketEvent<Message>(WS_EVENT.MESSAGE, (msg) => {
    if (msg.conversationId === activeId) return; // handled by ConversationView
    setConversations((prev) =>
      prev.map((c) =>
        c.id === msg.conversationId ? { ...c, updatedAt: msg.sentAt } : c,
      ),
    );
  });

  return (
    <RequireAuth roles={['HOST', 'ADMIN', 'GUEST']}>
      <div className="bg-sand-50 py-12">
        <div className="mx-auto max-w-content-2xl px-4 sm:px-6 lg:px-10">
          <header className="space-y-2">
            <p className="text-sm uppercase tracking-wide text-pine-600">Сообщения</p>
            <h1 className="text-3xl font-serif text-slate-900">Оставайтесь на связи с партнёрами</h1>
            <p className="text-sm text-slate-600">
              Здесь собраны все ваши переписки. Быстрые ответы помогают повышать рейтинг и улучшать впечатление гостей.
            </p>
          </header>

          <div className="mt-10 grid gap-6 lg:grid-cols-[320px_1fr]">
            <aside className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Диалоги</h2>
                <Button
                  variant="ghost"
                  onClick={() => markAllMessagesRead().then(loadConversations)}
                >
                  Прочитать всё
                </Button>
              </div>
              <div className="space-y-2">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-14 animate-pulse rounded-2xl bg-white" />
                  ))
                ) : conversations.length === 0 ? (
                  <p className="text-sm text-slate-500">Переписок пока нет.</p>
                ) : (
                  conversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => setActiveId(conversation.id)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                        activeId === conversation.id
                          ? 'border-pine-500 bg-white text-pine-600'
                          : 'border-transparent bg-white text-slate-600 hover:border-pine-200'
                      }`}
                    >
                      <span className="block font-semibold text-slate-900">
                        {conversation.listing?.title ?? 'Сообщения'}
                      </span>
                      <span className="block text-xs text-slate-500">
                        Обновлено {new Date(conversation.updatedAt).toLocaleString('ru-RU')}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </aside>

            {activeId && user ? (
              <ConversationView
                key={activeId}
                conversationId={activeId}
                userId={user.id}
              />
            ) : (
              <section className="flex items-center justify-center min-h-[420px] rounded-3xl bg-white p-6 shadow-soft">
                <p className="text-sm text-slate-500">Выберите диалог, чтобы прочитать сообщения.</p>
              </section>
            )}
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
