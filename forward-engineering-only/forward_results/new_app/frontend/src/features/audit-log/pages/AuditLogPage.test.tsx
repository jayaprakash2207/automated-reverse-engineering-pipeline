import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuditLogPage } from './AuditLogPage';
import * as auditLogApi from '../api/auditLogApi';

jest.mock('../api/auditLogApi');

const ENTRY = {
  auditEntryId: 'audit-1',
  occurredAt: '2026-01-01T00:00:00Z',
  actorName: 'Jamie Rivera',
  actorId: 'u1',
  action: 'LEAVE_APPROVED',
  entityType: 'LEAVE_REQUEST',
  entityId: 'l1',
  outcome: 'SUCCESS' as const,
};

describe('AuditLogPage (integration)', () => {
  it('loads and displays audit entries on initial render', async () => {
    jest.spyOn(auditLogApi, 'searchAuditLogs').mockResolvedValue({ entries: [ENTRY], totalCount: 1 });

    render(<AuditLogPage />);

    await waitFor(() => expect(screen.getByText('Jamie Rivera')).toBeInTheDocument());
    expect(auditLogApi.searchAuditLogs).toHaveBeenCalledWith({}, 0, 25, expect.anything());
  });

  it('applying a filter re-scopes the search and resets to the first page', async () => {
    const search = jest.spyOn(auditLogApi, 'searchAuditLogs').mockResolvedValue({ entries: [ENTRY], totalCount: 50 });
    render(<AuditLogPage />);
    await waitFor(() => expect(screen.getByText('Page 1 of 2')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(search).toHaveBeenLastCalledWith({}, 1, 25, expect.anything()));

    fireEvent.change(screen.getByLabelText('Actor'), { target: { value: 'Jamie Rivera' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));

    await waitFor(() =>
      expect(search).toHaveBeenLastCalledWith({ actorName: 'Jamie Rivera' }, 0, 25, expect.anything())
    );
  });

  it('shows the error banner instead of the table when the search fails', async () => {
    jest.spyOn(auditLogApi, 'searchAuditLogs').mockRejectedValue(new Error('audit service unavailable'));

    render(<AuditLogPage />);

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('audit service unavailable'));
  });
});
