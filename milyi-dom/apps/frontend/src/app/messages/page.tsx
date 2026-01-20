"use client";

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { RequireAuth } from '../../components/ui/require-auth';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import {
  fetchConversations,
  fetchConversation,
  sendMessage,
  markMessageRead,
  markAllMessagesRead,
} from '../../services/messages';
import type { Conversation, Message } from '../../types/api';
import { parseError } from '../../lib/api-client';
import { useAuth } from '../../hooks/useAuth';

export default function MessagesPage() {
  const { user, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [body, setBody] = useState('');

  const loadConversations = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const data = await fetchConversations();
      setConversations(data);
      if (data.length > 0) {
        setActiveId(data[0].id);
      } else {
        setActiveId(null);
        setMessages([]);
      }
    } catch (error) {
      const { message } = parseError(error);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadConversation = useCallback(
    async (conversationId: string) => {
      if (!isAuthenticated) return;
      try {
        const data = await fetchConversation(conversationId);
        setMessages(data.messages);
        await markAllMessagesRead();
      } catch (error) {
        const { message } = parseError(error);
        toast.error(message);
      }
    },
    [isAuthenticated],
  );

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeId) {
      loadConversation(activeId);
    }
  }, [activeId, loadConversation]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!body.trim() || !activeId) return;
    setSending(true);
    try {
      const message = await sendMessage({ conversationId: activeId, body });
      setMessages((prev) => [...prev, message]);
      setBody('');
    } catch (error) {
      const { message } = parseError(error);
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    setActiveId(conversationId);
  };

  const handleMarkRead = async (messageId: string) => {
    try {
      await markMessageRead(messageId);
      setMessages((prev) =>
        prev.map((message) => (message.id === messageId ? { ...message, readAt: new Date().toISOString() } : message)),
      );
    } catch (error) {
      const { message } = parseError(error);
      toast.error(message);
    }
  };

  const heading = activeId ? `ID ${activeId.slice(0, 8)}` : 'Выберите переписку';

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
                <Button variant="ghost" onClick={() => markAllMessagesRead().then(loadConversations)}>
                  Прочитать всё
                </Button>
              </div>
              <div className="space-y-2">
                {loading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-14 animate-pulse rounded-2xl bg-white" />
                  ))
                ) : conversations.length === 0 ? (
                  <p className="text-sm text-slate-500">Переписок пока нет.</p>
                ) : (
                  conversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => handleSelectConversation(conversation.id)}
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

            <section className="flex min-h-[420px] flex-col gap-4 rounded-3xl bg-white p-6 shadow-soft">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Переписка</h2>
                <span className="text-xs uppercase tracking-wide text-slate-400">{heading}</span>
              </div>
              <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-100 bg-sand-50 p-4">
                {messages.length === 0 ? (
                  <p className="text-sm text-slate-500">Выберите диалог, чтобы прочитать сообщения.</p>
                ) : (
                  <div className="space-y-3">
                    {messages.map((message) => {
                      const isMine = message.senderId === user?.id;
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
                          <div className="mt-2 flex items-center justify-between text-[11px] text-white/80">
                            <span>{new Date(message.sentAt).toLocaleString('ru-RU')}</span>
                            {!isMine && !message.readAt && (
                              <button className="text-white" onClick={() => handleMarkRead(message.id)}>
                                Прочитано
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <form onSubmit={handleSend} className="space-y-3">
                <Textarea
                  rows={3}
                  placeholder="Напишите сообщение"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={sending || !activeId}>
                    Отправить
                  </Button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
