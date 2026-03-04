import React from "react";
import { render, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import HostBookingsPage from "./page";

const fetchHostBookingsMock = vi.fn();
const updateBookingStatusMock = vi.fn();
let allowGuardedChildren = true;

const requireAuthMock = vi.fn(
  ({
    children,
  }: {
    children: React.ReactNode;
    roles?: string[];
  }) => (allowGuardedChildren ? <>{children}</> : null),
);

vi.mock("../../../services/bookings", () => ({
  fetchHostBookings: (...args: unknown[]) => fetchHostBookingsMock(...args),
  updateBookingStatus: (...args: unknown[]) => updateBookingStatusMock(...args),
}));

vi.mock("../../../components/ui/require-auth", () => ({
  RequireAuth: (props: { children: React.ReactNode; roles?: string[] }) => requireAuthMock(props),
}));

describe("HostBookingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    allowGuardedChildren = true;
    fetchHostBookingsMock.mockResolvedValue({ items: [] });
  });

  it("enforces HOST/ADMIN guard via RequireAuth wrapper", async () => {
    render(<HostBookingsPage />);

    await waitFor(() => {
      expect(fetchHostBookingsMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(requireAuthMock).toHaveBeenCalled();
    });

    const calls = requireAuthMock.mock.calls as Array<
      [{ roles?: string[]; children: React.ReactNode }]
    >;
    expect(calls.length).toBeGreaterThan(0);
    for (const [props] of calls) {
      expect(props.roles).toEqual(["HOST", "ADMIN"]);
    }
  });

  it("does not call bookings API when guard blocks content", async () => {
    allowGuardedChildren = false;
    render(<HostBookingsPage />);

    await waitFor(() => {
      expect(requireAuthMock).toHaveBeenCalled();
    });

    expect(fetchHostBookingsMock).not.toHaveBeenCalled();
  });
});

