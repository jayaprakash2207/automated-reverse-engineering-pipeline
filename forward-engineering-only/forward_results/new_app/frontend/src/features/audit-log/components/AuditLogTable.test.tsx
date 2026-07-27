import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditLogTable } from './AuditLogTable';
import { AuditLogEntry } from '../types/auditLog';

const ENTRY: AuditLogEntry = {
  id: 'audit-1',
  occurredAt: '2026-07-20T10:00:00Z',
  actorId: 'user-1',
  actorName: 'Jane Doe',
  action: 'LEAVE_REQUEST_APPROVED',
  entityType: 'LeaveRequest',
  entityId: 'leave-1',
  status: 'SUCCESS',
  details: 'Approved 3 days of annual leave',
  traceId: 'trace-1',
};

describe('AuditLogTable', () => {
  it('shows an empty state when there are no entries', () => {
    render(<AuditLogTable entries={[]} onSelectEntry={jest.fn()} />);
    expect(screen.getByText('No audit log entries match the current filters.')).toBeInTheDocument();
  });

  it('invokes onSelectEntry when a row is opened', async () => {
    const user = userEvent.setup();
    const onSelectEntry = jest.fn();
    render(<AuditLogTable entries={[ENTRY]} onSelectEntry={onSelectEntry} />);

    await user.click(screen.getByRole('button', { name: /2026/ }));

    expect(onSelectEntry).toHaveBeenCalledWith(ENTRY);
  });
});
