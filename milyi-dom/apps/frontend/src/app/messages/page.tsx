"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { RequireAuth } from "../../components/ui/require-auth";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import {
  fetchConversations,
  fetchConversation,
  markAllMessagesRead,
  sendMessage,
} from "../../services/messages";
import type { Conversation, Message } from "../../types/api";
import { parseError } from "../../lib/api-client";
import { useAuth } from "../../hooks/useAuth";
import {
  useConversationRoom,
  useSocketConnect,
  useSocketEvent,
  WS_EVENT,
  getSocket,
} from "../../hooks/useSocket";

function ConversationView({
  conversationId,
  userId,
  onConversationUpdate,
}: {
  conversationId: string;
  userId: string;
  onConversationUpdate?: (conversationId: string, updatedAt: string) => void;
}) {
  const socket = useSocketConnect();
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendingRef = useRef(false);

  useConversationRoom(conversationId, socket);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchConversation(conversationId);
        setMessages(data.messages);

        const activeSocket = getSocket();
        if (activeSocket?.connected) {
          activeSocket.emit(WS_EVENT.MARK_READ, { conversationId });
        }
      } catch (error) {
        toast.error(parseError(error).message);
      }
    };

    void load();
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
    };
  }, []);

  useSocketEvent<Message>(
    WS_EVENT.MESSAGE,
    (message) => {
      if (message.conversationId !== conversationId) return;

      setMessages((prev) => {
        if (prev.some((item) => item.id === message.id)) return prev;
        return [...prev, message];
      });
      onConversationUpdate?.(message.conversationId, message.sentAt);

      const activeSocket = getSocket();
      if (activeSocket?.connected) {
        activeSocket.emit(WS_EVENT.MARK_READ, { conversationId });
      }
    },
    socket,
  );

  useSocketEvent<{ userId: string; conversationId: string }>(
    WS_EVENT.TYPING_START,
    (payload) => {
      if (payload.conversationId !== conversationId || payload.userId === userId) return;
      setIsTyping(true);
    },
    socket,
  );

  useSocketEvent<{ userId: string; conversationId: string }>(
    WS_EVENT.TYPING_STOP,
    (payload) => {
      if (payload.conversationId !== conversationId || payload.userId === userId) return;
      setIsTyping(false);
    },
    socket,
  );

  const emitTyping = useCallback(
    (typing: boolean) => {
      if (!socket?.connected) return;
      socket.emit(typing ? WS_EVENT.TYPING_START : WS_EVENT.TYPING_STOP, { conversationId });
    },
    [socket, conversationId],
  );

  const handleBodyChange = (value: string) => {
    setBody(value);
    emitTyping(true);

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => emitTyping(false), 2000);
  };

  const sendCurrentMessage = useCallback(async () => {
    const text = body.trim() || composerRef.current?.value.trim() || "";
    if (!text || sendingRef.current) return;

    sendingRef.current = true;
    setSending(true);
    try {
      const sent = await sendMessage({ conversationId, body: text });
      setMessages((prev) => (prev.some((item) => item.id === sent.id) ? prev : [...prev, sent]));
      onConversationUpdate?.(conversationId, sent.sentAt);
      setBody("");
      emitTyping(false);
    } catch (error) {
      toast.error(parseError(error).message);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }, [body, conversationId, emitTyping, onConversationUpdate]);

  const handleSend = (event?: FormEvent) => {
    event?.preventDefault();
    void sendCurrentMessage();
  };

  return (
    <section className="flex min-h-[420px] flex-col gap-4 rounded-3xl bg-white p-4 shadow-soft sm:p-6">
      <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Переписка</h2>

      <div className="max-h-[min(60vh,480px)] flex-1 overflow-y-auto rounded-2xl border border-slate-100 bg-sand-50 p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500">Напишите первое сообщение.</p>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => {
              const isMine = message.senderId === userId;

              return (
                <div
                  key={message.id}
                  className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm shadow-soft sm:max-w-[80%] ${
                    isMine
                      ? "ml-auto bg-pine-600 text-white"
                      : message.readAt
                        ? "bg-white text-slate-700"
                        : "bg-pine-50 text-pine-700"
                  }`}
                >
                  <p>{message.body}</p>
                  <span className="mt-1 block text-[11px] opacity-60">
                    {new Date(message.sentAt).toLocaleString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-center gap-1 px-4 py-2 text-xs text-slate-400">
                <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="space-y-3">
        <Textarea
          ref={composerRef}
          rows={3}
          placeholder="Напишите сообщение..."
          value={body}
          onChange={(event) => handleBodyChange(event.target.value)}
          onBlur={(event) => {
            const nextTarget = event.relatedTarget as HTMLElement | null;
            if (nextTarget?.dataset.sendMessageButton === "true") {
              void sendCurrentMessage();
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              void sendCurrentMessage();
            }
          }}
        />
        <div className="flex justify-end">
          <Button
            className="w-full active:scale-100 sm:w-auto"
            type="button"
            data-send-message-button="true"
            onPointerDown={(event) => {
              if (event.pointerType === "mouse" && event.button !== 0) return;
              event.preventDefault();
              void sendCurrentMessage();
            }}
            onClick={() => handleSend()}
            disabled={sending}
          >
            Отправить
          </Button>
        </div>
      </form>
    </section>
  );
}

export default function MessagesPage() {
  const socket = useSocketConnect();
  const { user, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobilePane, setMobilePane] = useState<"list" | "chat">("list");

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

  const handleConversationUpdate = useCallback((conversationId: string, updatedAt: string) => {
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId ? { ...conversation, updatedAt } : conversation,
      ),
    );
  }, []);

  useSocketEvent<Message>(
    WS_EVENT.MESSAGE,
    (message) => {
      if (message.conversationId === activeId) return;
      handleConversationUpdate(message.conversationId, message.sentAt);
    },
    socket,
  );

  return (
    <RequireAuth roles={["HOST", "ADMIN", "GUEST"]}>
      <div className="bg-sand-50 py-8 sm:py-12">
        <div className="mx-auto max-w-content-2xl px-4 sm:px-6 lg:px-10">
          <header className="space-y-2">
            <p className="text-sm uppercase tracking-wide text-pine-600">Сообщения</p>
            <h1 className="text-2xl font-serif text-slate-900 sm:text-3xl">
              Оставайтесь на связи с партнёрами
            </h1>
            <p className="text-sm text-slate-600">
              Здесь собраны все ваши переписки. Быстрые ответы помогают повышать рейтинг и
              улучшать впечатление гостей.
            </p>
          </header>

          <div className="mt-8 grid gap-6 lg:mt-10 lg:grid-cols-[320px_1fr]">
            <aside className={`space-y-3 ${mobilePane === "chat" ? "hidden lg:block" : ""}`}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Диалоги</h2>
                <Button
                  variant="ghost"
                  className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
                  onClick={() => {
                    void markAllMessagesRead().then(loadConversations);
                  }}
                >
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
                      onClick={() => {
                        setActiveId(conversation.id);
                        setMobilePane("chat");
                      }}
                      className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                        activeId === conversation.id
                          ? "border-pine-500 bg-white text-pine-600"
                          : "border-transparent bg-white text-slate-600 hover:border-pine-200"
                      }`}
                    >
                      <span className="block font-semibold text-slate-900">
                        {conversation.listing?.title ?? "Сообщения"}
                      </span>
                      <span className="block text-xs text-slate-500">
                        Обновлено {new Date(conversation.updatedAt).toLocaleString("ru-RU")}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </aside>

            <div className={mobilePane === "list" ? "hidden lg:block" : ""}>
              {activeId && user ? (
                <div className="space-y-3">
                  <div className="lg:hidden">
                    <Button
                      variant="ghost"
                      className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
                      onClick={() => setMobilePane("list")}
                    >
                      ← К списку диалогов
                    </Button>
                  </div>
                  <ConversationView
                    key={activeId}
                    conversationId={activeId}
                    userId={user.id}
                    onConversationUpdate={handleConversationUpdate}
                  />
                </div>
              ) : (
                <section className="flex min-h-[420px] items-center justify-center rounded-3xl bg-white p-6 shadow-soft">
                  <p className="text-sm text-slate-500">
                    Выберите диалог, чтобы прочитать сообщения.
                  </p>
                </section>
              )}
            </div>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
