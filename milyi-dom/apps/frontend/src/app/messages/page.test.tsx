import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import MessagesPage from "./page";

const fetchConversationsMock = vi.fn();
const fetchConversationMock = vi.fn();
const markAllMessagesReadMock = vi.fn();
const sendMessageMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock("../../services/messages", () => ({
  fetchConversations: (...args: unknown[]) => fetchConversationsMock(...args),
  fetchConversation: (...args: unknown[]) => fetchConversationMock(...args),
  markAllMessagesRead: (...args: unknown[]) => markAllMessagesReadMock(...args),
  sendMessage: (...args: unknown[]) => sendMessageMock(...args),
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("../../hooks/useSocket", () => ({
  useSocketConnect: () => null,
  useConversationRoom: () => undefined,
  useSocketEvent: () => undefined,
  getSocket: () => null,
  WS_EVENT: {
    MESSAGE: "message",
    MARK_READ: "mark_read",
    TYPING_START: "typing_start",
    TYPING_STOP: "typing_stop",
  },
}));

vi.mock("../../components/ui/require-auth", () => ({
  RequireAuth: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("MessagesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({
      user: { id: "user-1", role: "GUEST" },
      isAuthenticated: true,
    });

    fetchConversationsMock.mockResolvedValue([
      {
        id: "conv-1",
        hostId: "host-1",
        guestId: "guest-1",
        listing: { title: "Тестовое объявление" },
        host: {},
        guest: {},
        messages: [],
        updatedAt: "2026-03-04T10:00:00.000Z",
      },
    ]);

    fetchConversationMock.mockResolvedValue({
      id: "conv-1",
      hostId: "host-1",
      guestId: "guest-1",
      listing: null,
      host: {},
      guest: {},
      messages: [],
      updatedAt: "2026-03-04T10:00:00.000Z",
    });

    markAllMessagesReadMock.mockResolvedValue({ success: true });
    sendMessageMock.mockResolvedValue({
      id: "msg-1",
      conversationId: "conv-1",
      senderId: "user-1",
      recipientId: "host-1",
      body: "Привет",
      sentAt: "2026-03-04T10:01:00.000Z",
      readAt: null,
    });
  });

  it("sends message via REST API and clears composer", async () => {
    render(<MessagesPage />);

    const conversationButton = await screen.findByRole("button", {
      name: /Тестовое объявление/i,
    });
    fireEvent.click(conversationButton);

    const textbox = await screen.findByPlaceholderText("Напишите сообщение...");
    fireEvent.change(textbox, { target: { value: "Привет" } });
    fireEvent.click(screen.getByRole("button", { name: "Отправить" }));

    await waitFor(() => {
      expect(sendMessageMock).toHaveBeenCalledWith({
        conversationId: "conv-1",
        body: "Привет",
      });
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("")).toBeInTheDocument();
    });

    expect(await screen.findByText("Привет")).toBeInTheDocument();
  });
});
