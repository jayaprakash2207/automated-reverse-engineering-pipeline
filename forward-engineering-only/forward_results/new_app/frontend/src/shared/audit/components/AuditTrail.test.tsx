import { render, screen, waitFor } from '@testing-library/react';
import { AuditTrail } from './AuditTrail';

describe('AuditTrail', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it('shows entries once loaded', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        content: [
          {
            id: 'e1',
            occurredAt: '2026-07-20T10:00:00Z',
            actorId: 'u1',
            actorName: 'Jane Manager',
            entityType: 'LeaveRequest',
            entityId: 'lr-1',
            action: 'APPROVE',
            result: 'SUCCESS',
            summary: 'Approved 3 days of annual leave',
          },
        ],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
      }),
    }) as unknown as typeof fetch;

    render(<AuditTrail entityType="LeaveRequest" entityId="lr-1" />);

    await waitFor(() => expect(screen.getByText('Jane Manager')).toBeInTheDocument());
    expect(screen.getByText(/Approved 3 days of annual leave/)).toBeInTheDocument();
  });

  it('shows an error state with a retry option when the request fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        timestamp: '2026-07-20T10:00:00Z',
        status: 500,
        errorCode: 'INTERNAL_ERROR',
        message: 'Unable to load audit history right now.',
        path: '/api/v1/audit-entries',
        traceId: 'trace-5',
      }),
    }) as unknown as typeof fetch;

    render(<AuditTrail entityType="LeaveRequest" entityId="lr-1" />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load audit history right now.');
  });
});
