import { render, screen } from '@testing-library/react';
import { AuditTrailPanel } from './AuditTrailPanel';
import { AuditLogEntry } from '../types/auditLog';

const ENTRY: AuditLogEntry = {
  auditEntryId: 'audit-1',
  occurredAt: '2026-01-01T12:00:00Z',
  actorName: 'Jamie Rivera',
  actorId: 'user-1',
  action: 'LEAVE_APPROVED',
  entityType: 'LEAVE_REQUEST',
  entityId: 'leave-1',
  outcome: 'SUCCESS',
};

const SECOND_ENTRY: AuditLogEntry = {
  auditEntryId: 'audit-2',
  occurredAt: '2026-01-02T09:30:00Z',
  actorName: 'Morgan Lee',
  actorId: 'user-2',
  action: 'LEAVE_REJECTED',
  entityType: 'LEAVE_REQUEST',
  entityId: 'leave-2',
  outcome: 'FAILURE',
};

describe('AuditTrailPanel', () => {
  it('shows the default empty message when there are no entries and none is supplied', () => {
    render(<AuditTrailPanel entries={[]} />);
    expect(screen.getByText('No audit history recorded for this item yet.')).toBeInTheDocument();
  });

  it('uses a custom empty message when supplied', () => {
    render(<AuditTrailPanel entries={[]} emptyMessage="No audit entries match the current filters." />);
    expect(screen.getByText('No audit entries match the current filters.')).toBeInTheDocument();
    expect(screen.queryByText('No audit history recorded for this item yet.')).not.toBeInTheDocument();
  });

  it('renders one row per audit entry when entries are present', () => {
    render(<AuditTrailPanel entries={[ENTRY]} />);
    expect(screen.getByText('Jamie Rivera')).toBeInTheDocument();
    expect(screen.getByText('audit-1')).toBeInTheDocument();
  });

  it('renders every entry in the order supplied, including both success and failure outcomes', () => {
    render(<AuditTrailPanel entries={[ENTRY, SECOND_ENTRY]} />);
    const rows = screen.getAllByRole('row');
    // header row + one row per entry
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent('Jamie Rivera');
    expect(rows[1]).toHaveTextContent('SUCCESS');
    expect(rows[2]).toHaveTextContent('Morgan Lee');
    expect(rows[2]).toHaveTextContent('FAILURE');
  });

  it('shows a loading status when isLoading is true, even if entries are also present', () => {
    render(<AuditTrailPanel entries={[ENTRY]} isLoading />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading audit trail');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
