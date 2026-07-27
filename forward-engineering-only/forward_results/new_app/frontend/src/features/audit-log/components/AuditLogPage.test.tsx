import { render, screen } from '@testing-library/react';
import { AuditLogPage } from './AuditLogPage';
import { useCurrentUser } from '../../../shared/hooks/useCurrentUser';
import { useAuditLogs } from '../hooks/useAuditLogs';

jest.mock('../../../shared/hooks/useCurrentUser');
jest.mock('../hooks/useAuditLogs');

const mockUseCurrentUser = useCurrentUser as jest.Mock;
const mockUseAuditLogs = useAuditLogs as jest.Mock;

describe('AuditLogPage', () => {
  it('denies access to users without the ADMIN or AUDITOR role', () => {
    mockUseCurrentUser.mockReturnValue({ subject: 'user-1', roles: ['EMPLOYEE'] });
    mockUseAuditLogs.mockReturnValue({ data: null, isLoading: false, error: null });

    render(<AuditLogPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('do not have permission');
  });

  it('renders audit log entries for an authorized auditor', () => {
    mockUseCurrentUser.mockReturnValue({ subject: 'user-2', roles: ['AUDITOR'] });
    mockUseAuditLogs.mockReturnValue({
      data: {
        content: [
          {
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
          },
        ],
        page: 0,
        size: 25,
        totalElements: 1,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
    });

    render(<AuditLogPage />);

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });
});
