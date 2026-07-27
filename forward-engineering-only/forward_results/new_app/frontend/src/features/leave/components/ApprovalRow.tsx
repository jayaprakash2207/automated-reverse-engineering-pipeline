import { useState } from 'react';
import type { LeaveRequestDto } from '../types/leaveRequest';
import { RejectReasonDialog } from './RejectReasonDialog';

export interface ApprovalRowProps {
  request: LeaveRequestDto;
  busy: boolean;
  onApprove: (id: number) => void;
  onReject: (id: number, reason: string) => void;
}

export function ApprovalRow({ request, busy, onApprove, onReject }: ApprovalRowProps) {
  const [rejecting, setRejecting] = useState(false);

  return (
    <tr>
      <td>{request.employeeName}</td>
      <td>{request.leaveType}</td>
      <td>
        {request.startDate} – {request.endDate}
      </td>
      <td>{request.daysRequested}</td>
      <td>{request.balanceAfterRequest}</td>
      <td>
        {rejecting ? (
          <RejectReasonDialog
            submitting={busy}
            onCancel={() => setRejecting(false)}
            onSubmit={reason => {
              onReject(request.id, reason);
              setRejecting(false);
            }}
          />
        ) : (
          <div className="approval-row-actions">
            <button type="button" onClick={() => onApprove(request.id)} disabled={busy}>
              {busy ? 'Working…' : 'Approve'}
            </button>
            <button type="button" onClick={() => setRejecting(true)} disabled={busy}>
              Reject
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
