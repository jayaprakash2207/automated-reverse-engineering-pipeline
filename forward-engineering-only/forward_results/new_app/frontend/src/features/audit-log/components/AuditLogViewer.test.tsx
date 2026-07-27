import { render, screen, fireEvent } from '@testing-library/react';
import { AuditLogViewer } from './AuditLogViewer';
import { useAuth } from '../../../shared/auth/useAuth';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { ROLES } from '../../../shared/auth/roles';

jest.mock('../../../shared/auth/useAuth');
jest.mock('../hooks/useAuditLogs');

const mockUseAuth = useAuth as jest.Mock;
const mockUseAuditLogs = useAuditLogs as jest.Mock;

describe('AuditLogViewer', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { userId: '1', email: 'reviewer@example.com', roles: [ROLES.SYSTEM_AUDIT_REVIEWER] },
      logout: jest.fn(),
    });
  });

  it('shows a not-authorized message for a user without the System/Audit Reviewer role', () => {
    mockUseAuth.mockReturnValue({
      user: { userId: '2', email: 'manager@example.com', roles: [ROLES.MANAGER] },
      logout: jest.fn(),
    });
    mockUseAuditLogs.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      page: 0,
      setPage: jest.fn(),
      refetch: jest.fn(),
    });

    render(<AuditLogViewer />);
    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
  });

  it('renders audit entries for an authorized reviewer', () => {
    mockUseAuditLogs.mockReturnValue({
      data: {
        content: [
          {
            id: 'audit-1',
            occurredAt: '2026-07-27T10:00:00Z',
            actorId: '10',
            actorEmail: 'manager@example.com',
            action: 'LEAVE_APPROVED',
            entityType: 'LEAVE_REQUEST',
            entityId: '55',
            result: 'SUCCESS',
          },
        ],
        totalElements: 1,
        page: 0,
        size: 25,
      },
      loading: false,
      error: null,
      page: 0,
      setPage: jest.fn(),
      refetch: jest.fn(),
    });

    render(<AuditLogViewer />);
    expect(screen.getByText('LEAVE_APPROVED')).toBeInTheDocument();
    expect(screen.getByText('manager@example.com')).toBeInTheDocument();
  });

  it('shows a retry control when loading audit entries fails', () => {
    const refetch = jest.fn();
    mockUseAuditLogs.mockReturnValue({
      data: null,
      loading: false,
      error: 'Unable to load audit logs.',
      page: 0,
      setPage: jest.fn(),
      refetch,
    });

    render(<AuditLogViewer />);
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(refetch).toHaveBeenCalled();
  });
});
