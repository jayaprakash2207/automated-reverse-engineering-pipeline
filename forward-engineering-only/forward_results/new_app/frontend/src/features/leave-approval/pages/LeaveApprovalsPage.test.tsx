import { render, screen, waitFor } from '@testing-library/react';
import { LeaveApprovalsPage } from './LeaveApprovalsPage';
import * as leaveApprovalApi from '../api/leaveApprovalApi';

jest.mock('../api/leaveApprovalApi');

describe('LeaveApprovalsPage (integration)', () => {
  it('renders the page heading and delegates loading/empty-state handling to the approval list', async () => {
    jest.spyOn(leaveApprovalApi, 'fetchPendingLeaveApprovals').mockResolvedValue([]);

    render(<LeaveApprovalsPage />);

    expect(screen.getByRole('heading', { name: 'Pending Leave Approvals' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('No pending leave approvals.')).toBeInTheDocument());
  });
});
