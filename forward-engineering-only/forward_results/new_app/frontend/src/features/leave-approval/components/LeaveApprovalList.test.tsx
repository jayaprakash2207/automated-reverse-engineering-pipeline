import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LeaveApprovalList } from './LeaveApprovalList';
import * as usePendingLeaveApprovalsModule from '../hooks/usePendingLeaveApprovals';
import * as leaveApprovalApi from '../api/leaveApprovalApi';

const APPROVAL = {
  leaveRequestId: 'l1',
  employeeName: 'Dana Kim',
  leaveType: 'PTO',
  startDate: '2026-08-01',
  endDate: '2026-08-02',
  daysRequested: 1,
  balanceAfterApproval: 9,
  status: 'PENDING' as const,
};

describe('LeaveApprovalList (isolated, hook mocked)', () => {
  jest.mock('../hooks/usePendingLeaveApprovals');

  it('shows a loading indicator while pending approvals are loading', () => {
    jest.spyOn(usePendingLeaveApprovalsModule, 'usePendingLeaveApprovals').mockReturnValue({
      approvals: [],
      isLoading: true,
      error: null,
      removeFromList: jest.fn(),
    });

    render(<LeaveApprovalList />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading pending approvals');
  });

  it('shows an alert when loading fails', () => {
    jest.spyOn(usePendingLeaveApprovalsModule, 'usePendingLeaveApprovals').mockReturnValue({
      approvals: [],
      isLoading: false,
      error: 'Failed to load pending approvals.',
      removeFromList: jest.fn(),
    });

    render(<LeaveApprovalList />);
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load pending approvals.');
  });

  it('shows an empty-state message when there are no pending approvals', () => {
    jest.spyOn(usePendingLeaveApprovalsModule, 'usePendingLeaveApprovals').mockReturnValue({
      approvals: [],
      isLoading: false,
      error: null,
      removeFromList: jest.fn(),
    });

    render(<LeaveApprovalList />);
    expect(screen.getByText('No pending leave approvals.')).toBeInTheDocument();
  });

  it('renders a table with one row per pending approval and the expected column headers', () => {
    jest.spyOn(usePendingLeaveApprovalsModule, 'usePendingLeaveApprovals').mockReturnValue({
      approvals: [APPROVAL],
      isLoading: false,
      error: null,
      removeFromList: jest.fn(),
    });

    render(<LeaveApprovalList />);
    expect(screen.getByRole('table', { name: 'Pending leave approvals' })).toBeInTheDocument();
    expect(screen.getByText('Employee')).toBeInTheDocument();
    expect(screen.getByText('Balance after approval')).toBeInTheDocument();
    expect(screen.getByText('Dana Kim')).toBeInTheDocument();
  });
});

describe('LeaveApprovalList (integration, real hook + mocked api)', () => {
  jest.mock('../api/leaveApprovalApi');

  it('removes a row from the rendered list once its approval is confirmed with an audit entry id', async () => {
    jest.spyOn(leaveApprovalApi, 'fetchPendingLeaveApprovals').mockResolvedValue([APPROVAL]);
    jest.spyOn(leaveApprovalApi, 'approveLeaveRequest').mockResolvedValue({ status: 'SUCCESS', auditEntryId: 'audit-1' });

    render(<LeaveApprovalList />);

    await waitFor(() => expect(screen.getByText('Dana Kim')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(screen.getByText('No pending leave approvals.')).toBeInTheDocument());
    expect(screen.queryByText('Dana Kim')).not.toBeInTheDocument();
  });
});
