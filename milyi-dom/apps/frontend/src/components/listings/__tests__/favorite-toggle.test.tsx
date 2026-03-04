import { render, fireEvent, screen, waitFor, act } from "@testing-library/react";
import { vi } from "vitest";
import React from "react";
import { FavoriteToggle } from "../favorite-toggle";

const addFavoriteMock = vi.fn();
const removeFavoriteMock = vi.fn();
const checkFavoriteMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock("../../../services/favorites", () => ({
  addFavorite: (...args: unknown[]) => addFavoriteMock(...args),
  removeFavorite: (...args: unknown[]) => removeFavoriteMock(...args),
  checkFavorite: (...args: unknown[]) => checkFavoriteMock(...args),
}));

vi.mock("../../../services/favorites.ts", () => ({
  addFavorite: (...args: unknown[]) => addFavoriteMock(...args),
  removeFavorite: (...args: unknown[]) => removeFavoriteMock(...args),
  checkFavorite: (...args: unknown[]) => checkFavoriteMock(...args),
}));

vi.mock("../../../hooks/useAuth", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("../../../hooks/useAuth.ts", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

describe("FavoriteToggle", () => {
  const OFFLINE_ID = "offline-demo";
  const REMOTE_ID = "00000000-0000-4000-8000-000000000000";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  checkFavoriteMock.mockResolvedValue({ isFavorite: false });
  addFavoriteMock.mockResolvedValue({});
  removeFavoriteMock.mockResolvedValue({});
  useAuthMock.mockImplementation(() => ({ isAuthenticated: false }));
});

  it("stores offline favorites in localStorage and reflects active state", async () => {
    render(<FavoriteToggle listingId={OFFLINE_ID} appearance="icon" />);
    const button = screen.getByRole("button");

    expect(button).toHaveAttribute("aria-pressed", "false");

    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(button).toHaveAttribute("aria-pressed", "true");
    });

    const stored = JSON.parse(
      localStorage.getItem("milyi-dom-offline-favorites") ?? "[]",
    );
    expect(stored).toContain(OFFLINE_ID);
    expect(addFavoriteMock).not.toHaveBeenCalled();
    expect(toastSuccessMock).toHaveBeenCalledWith("Добавлено в избранное.");
  });

  it("adds a remote favorite when user is authenticated", async () => {
    useAuthMock.mockImplementation(() => ({ isAuthenticated: true }));
    render(<FavoriteToggle listingId={REMOTE_ID} appearance="icon" />);

    const button = screen.getByRole("button");

    await waitFor(() => {
      expect(checkFavoriteMock).toHaveBeenCalledWith(REMOTE_ID);
    });

    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(addFavoriteMock).toHaveBeenCalledWith(REMOTE_ID);
    });
    await waitFor(() => {
      expect(button).toHaveAttribute("aria-pressed", "true");
    });
    expect(
      JSON.parse(localStorage.getItem("milyi-dom-offline-favorites") ?? "[]"),
    ).not.toContain(REMOTE_ID);
    expect(toastSuccessMock).toHaveBeenCalledWith("Добавлено в избранное.");
  });

  it("prompts sign-in when remote favorite is toggled unauthenticated", () => {
    render(<FavoriteToggle listingId={REMOTE_ID} />);

    fireEvent.click(screen.getByRole("button", { name: /в избранное/i }));

    expect(addFavoriteMock).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith("Войдите, чтобы добавить в избранное.");
  });
});
