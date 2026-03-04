import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import HostPayoutsPage from './page';

const getPayoutStatusMock = vi.fn();
const savePayoutPhoneMock = vi.fn();
let allowGuardedChildren = true;
const requireAuthMock = vi.fn(
  ({
    children,
  }: {
    children: React.ReactNode;
    roles?: string[];
  }) => (allowGuardedChildren ? <>{children}</> : null),
);

vi.mock('../../../services/payments', () => ({
  getPayoutStatus: (...args: unknown[]) => getPayoutStatusMock(...args),
  savePayoutPhone: (...args: unknown[]) => savePayoutPhoneMock(...args),
}));

vi.mock('../../../components/ui/require-auth', () => ({
  RequireAuth: (props: { children: React.ReactNode; roles?: string[] }) =>
    requireAuthMock(props),
}));

describe('HostPayoutsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    allowGuardedChildren = true;
    getPayoutStatusMock.mockResolvedValue({ hasPayoutMethod: false, phone: null });
  });

  it('enforces HOST/ADMIN guard via RequireAuth wrapper', async () => {
    render(<HostPayoutsPage />);

    await waitFor(() => {
      expect(getPayoutStatusMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(requireAuthMock).toHaveBeenCalled();
    });

    const calls = requireAuthMock.mock.calls as Array<
      [{ roles?: string[]; children: React.ReactNode }]
    >;
    expect(calls.length).toBeGreaterThan(0);
    for (const [props] of calls) {
      expect(props.roles).toEqual(['HOST', 'ADMIN']);
    }
  });

  it('does not call payout API when guard blocks content', async () => {
    allowGuardedChildren = false;
    render(<HostPayoutsPage />);

    await waitFor(() => {
      expect(requireAuthMock).toHaveBeenCalled();
    });

    expect(getPayoutStatusMock).not.toHaveBeenCalled();
  });
});
