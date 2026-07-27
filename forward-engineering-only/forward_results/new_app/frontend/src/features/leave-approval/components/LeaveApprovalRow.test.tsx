import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LeaveApprovalRow } from './LeaveApprovalRow';
import * as leaveApprovalApi from '../api/leaveApprovalApi';
import { PendingLeaveApproval } from '../types/leaveApproval';

jest.mock('../api/leaveApprovalApi');

const APPROVAL: PendingLeaveApproval = {
  leaveRequestId: 'l1',
  employeeName: 'Dana Kim',
  leaveType: 'PTO',
  startDate: '2026-08-01',
  endDate: '2026-08-02',
  daysRequested: 1,
  balanceAfterApproval: 9,
  status: 'PENDING',
};

function renderRow(onResolved = jest.fn()) {
  render(
    <table>
      <tbody>
        <LeaveApprovalRow approval={APPROVAL} onResolved={onResolved} />
      </tbody>
    </table>
  );
  return onResolved;
}

describe('LeaveApprovalRow', () => {
  it('renders the approval details', () => {
    renderRow();
    expect(screen.getByText('Dana Kim')).toBeInTheDocument();
    expect(screen.getByText('PTO')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  describe('approve', () => {
    it('calls onResolved with the leaveRequestId once the approval succeeds with an audit entry id', async () => {
      jest.spyOn(leaveApprovalApi, 'approveLeaveRequest').mockResolvedValue({ status: 'SUCCESS', auditEntryId: 'audit-1' });
      const onResolved = renderRow();

      fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

      await waitFor(() => expect(onResolved).toHaveBeenCalledWith('l1'));
      expect(screen.getByTestId('action-banner-success')).toHaveTextContent('audit-1');
    });

    it('business rule: never calls onResolved when the approval fails, so the request stays visibly Pending rather than silently disappearing', async () => {
      jest.spyOn(leaveApprovalApi, 'approveLeaveRequest').mockRejectedValue(new Error('database unavailable'));
      const onResolved = renderRow();

      fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

      await waitFor(() => expect(screen.getByTestId('action-banner-system-failure')).toBeInTheDocument());
      expect(onResolved).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Approve' })).not.toBeDisabled();
    });
  });

  describe('reject', () => {
    it('reveals a reason field instead of submitting immediately', () => {
      renderRow();
      fireEvent.click(screen.getByRole('button', { name: 'Reject' }));

      expect(screen.getByLabelText('Reason for rejection')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    });

    it('business rule: blocks rejection when the reason is shorter than the 10-character minimum', () => {
      renderRow();
      fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
      fireEvent.change(screen.getByLabelText('Reason for rejection'), { target: { value: 'too short' } });
      fireEvent.click(screen.getByRole('button', { name: 'Confirm rejection' }));

      expect(leaveApprovalApi.rejectLeaveRequest).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Confirm rejection' })).toBeInTheDocument();
    });

    it('business rule: allows rejection once the trimmed reason meets the 10-character minimum (boundary)', async () => {
      jest.spyOn(leaveApprovalApi, 'rejectLeaveRequest').mockResolvedValue({ status: 'SUCCESS', auditEntryId: 'audit-2' });
      const onResolved = renderRow();

      fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
      fireEvent.change(screen.getByLabelText('Reason for rejection'), { target: { value: '  Reason: OK  ' } });
      fireEvent.click(screen.getByRole('button', { name: 'Confirm rejection' }));

      await waitFor(() => expect(onResolved).toHaveBeenCalledWith('l1'));
      expect(leaveApprovalApi.rejectLeaveRequest).toHaveBeenCalledWith('l1', 'Reason: OK');
    });

    it('Cancel exits rejection mode without calling the API', () => {
      renderRow();
      fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
      fireEvent.change(screen.getByLabelText('Reason for rejection'), { target: { value: 'Some reason here' } });
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(leaveApprovalApi.rejectLeaveRequest).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
      expect(screen.queryByLabelText('Reason for rejection')).not.toBeInTheDocument();
    });

    it('never calls onResolved when rejection fails, leaving the request visibly Pending', async () => {
      jest.spyOn(leaveApprovalApi, 'rejectLeaveRequest').mockRejectedValue(new Error('database unavailable'));
      const onResolved = renderRow();

      fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
      fireEvent.change(screen.getByLabelText('Reason for rejection'), { target: { value: 'Reason: OK' } });
      fireEvent.click(screen.getByRole('button', { name: 'Confirm rejection' }));

      await waitFor(() => expect(screen.getByTestId('action-banner-system-failure')).toBeInTheDocument());
      expect(onResolved).not.toHaveBeenCalled();
    });
  });
});
