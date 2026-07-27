import { useEffect, useState } from 'react';
import { useAuditedAction } from '../../../shared/hooks/useAuditedAction';
import { ActionResultBanner } from '../../../shared/components/ActionResultBanner';
import { approveLeaveRequest, rejectLeaveRequest } from '../api/leaveApprovalApi';
import { PendingLeaveApproval } from '../types/leaveApproval';

const MIN_REJECT_REASON_LENGTH = 10;

interface LeaveApprovalRowProps {
  approval: PendingLeaveApproval;
  onResolved: (leaveRequestId: string) => void;
}

// UI/UX Spec §2: inline approve/reject, no forced navigation to a detail screen.
// On success the row is removed from the pending list only after an audit_entry_id
// is confirmed; on system failure the row stays rendered as Pending with the error
// banner, so the request never silently appears "Approved" with no trace.
export function LeaveApprovalRow({ approval, onResolved }: LeaveApprovalRowProps) {
  const [isRejecting, setIsRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const approveAction = useAuditedAction(approveLeaveRequest);
  const rejectAction = useAuditedAction(rejectLeaveRequest);

  const activeState = isRejecting ? rejectAction.state : approveAction.state;

  // Bug fix (cross-cutting audit sprint): notifying the parent list used to happen
  // directly in the render body, which calls the parent's (LeaveApprovalList's)
  // state setter while this component is rendering — React's "Cannot update a
  // component while rendering a different component" anti-pattern. Deferring to
  // useEffect also means it only fires once per state *transition* rather than on
  // every re-render the parent happens to trigger while this row is still done/success.
  useEffect(() => {
    if (activeState.phase === 'done' && activeState.outcome.status === 'success') {
      onResolved(approval.leaveRequestId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeState, approval.leaveRequestId]);

  function handleApprove() {
    approveAction.run(approval.leaveRequestId);
  }

  function handleRejectSubmit() {
    if (reason.trim().length < MIN_REJECT_REASON_LENGTH) {
      return;
    }
    rejectAction.run(approval.leaveRequestId, reason.trim());
  }

  return (
    <tr>
      <td>{approval.employeeName}</td>
      <td>{approval.leaveType}</td>
      <td>
        {approval.startDate} – {approval.endDate}
      </td>
      <td>{approval.daysRequested}</td>
      <td>{approval.balanceAfterApproval}</td>
      <td>
        {!isRejecting && (
          <>
            <button type="button" onClick={handleApprove} disabled={activeState.phase === 'running'}>
              Approve
            </button>
            <button type="button" onClick={() => setIsRejecting(true)} disabled={activeState.phase === 'running'}>
              Reject
            </button>
          </>
        )}
        {isRejecting && (
          <div>
            <label htmlFor={`reject-reason-${approval.leaveRequestId}`}>Reason for rejection</label>
            <textarea
              id={`reject-reason-${approval.leaveRequestId}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              minLength={MIN_REJECT_REASON_LENGTH}
              required
            />
            <button type="button" onClick={handleRejectSubmit} disabled={rejectAction.state.phase === 'running'}>
              Confirm rejection
            </button>
            <button type="button" onClick={() => setIsRejecting(false)}>
              Cancel
            </button>
          </div>
        )}
        {activeState.phase === 'done' && (
          <ActionResultBanner
            outcome={activeState.outcome}
            onDismiss={isRejecting ? rejectAction.reset : approveAction.reset}
          />
        )}
      </td>
    </tr>
  );
}
