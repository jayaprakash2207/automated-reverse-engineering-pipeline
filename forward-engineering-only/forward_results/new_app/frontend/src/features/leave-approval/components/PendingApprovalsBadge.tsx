import { usePendingLeaveApprovals } from '../hooks/usePendingLeaveApprovals';

// UI/UX Spec §2: a persistent, always-visible entry point for the Manager role —
// a deliberate overcorrection versus the source system, which had no entry point
// at all for this task.
export function PendingApprovalsBadge() {
  const { approvals, isLoading } = usePendingLeaveApprovals();

  if (isLoading) {
    return null;
  }

  return (
    <div className="pending-approvals-badge" role="status" aria-label={`${approvals.length} pending leave approvals`}>
      Pending Approvals
      <span className="pending-approvals-badge__count">{approvals.length}</span>
    </div>
  );
}
