import { render, screen, waitFor } from '@testing-library/react';
import { PendingApprovalsBadge } from './PendingApprovalsBadge';
import * as leaveApprovalApi from '../api/leaveApprovalApi';

jest.mock('../api/leaveApprovalApi');

const APPROVAL = {
  leaveRequestId: 'l1',
  employeeName: 'A',
  leaveType: 'PTO',
  startDate: '2026-01-01',
  endDate: '2026-01-02',
  daysRequested: 1,
  balanceAfterApproval: 9,
  status: 'PENDING' as const,
};

describe('PendingApprovalsBadge', () => {
  it('renders nothing while approvals are still loading', () => {
    jest.spyOn(leaveApprovalApi, 'fetchPendingLeaveApprovals').mockReturnValue(new Promise(() => {}));
    const { container } = render(<PendingApprovalsBadge />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the live count once pending approvals load', async () => {
    jest.spyOn(leaveApprovalApi, 'fetchPendingLeaveApprovals').mockResolvedValue([APPROVAL, { ...APPROVAL, leaveRequestId: 'l2' }]);

    render(<PendingApprovalsBadge />);

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('2'));
  });

  it('shows zero when there are no pending approvals', async () => {
    jest.spyOn(leaveApprovalApi, 'fetchPendingLeaveApprovals').mockResolvedValue([]);

    render(<PendingApprovalsBadge />);

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('0'));
  });

  it('known gap: renders a "0" count rather than surfacing an error when the fetch fails', async () => {
    jest.spyOn(leaveApprovalApi, 'fetchPendingLeaveApprovals').mockRejectedValue(new Error('service unavailable'));

    render(<PendingApprovalsBadge />);

    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
    expect(screen.getByRole('status')).toHaveTextContent('0');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
