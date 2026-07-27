import { usePendingApprovals } from '../hooks/usePendingApprovals';

export function PendingApprovalsIndicator() {
  const { count, loading } = usePendingApprovals();

  if (loading) {
    return (
      <span className="pending-approvals-indicator" aria-live="polite">
        Pending Approvals: …
      </span>
    );
  }

  return (
    <span className="pending-approvals-indicator" aria-live="polite">
      Pending Approvals
      <span className="pending-approvals-count" data-testid="pending-approvals-count">
        {count}
      </span>
    </span>
  );
}
