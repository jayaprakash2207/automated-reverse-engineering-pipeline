import { usePendingLeaveApprovals } from '../hooks/usePendingLeaveApprovals';
import { LeaveApprovalRow } from './LeaveApprovalRow';

export function LeaveApprovalList() {
  const { approvals, isLoading, error, removeFromList } = usePendingLeaveApprovals();

  if (isLoading) {
    return <p role="status">Loading pending approvals…</p>;
  }

  if (error) {
    return <p role="alert">{error}</p>;
  }

  if (approvals.length === 0) {
    return <p>No pending leave approvals.</p>;
  }

  return (
    <table aria-label="Pending leave approvals">
      <thead>
        <tr>
          <th scope="col">Employee</th>
          <th scope="col">Leave type</th>
          <th scope="col">Dates</th>
          <th scope="col">Days requested</th>
          <th scope="col">Balance after approval</th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        {approvals.map((approval) => (
          <LeaveApprovalRow key={approval.leaveRequestId} approval={approval} onResolved={removeFromList} />
        ))}
      </tbody>
    </table>
  );
}
