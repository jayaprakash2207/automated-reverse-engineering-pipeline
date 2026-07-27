import { useEffect, useState } from 'react';
import { fetchPendingLeaveApprovals } from '../api/leaveApprovalApi';
import { PendingLeaveApproval } from '../types/leaveApproval';

export function usePendingLeaveApprovals() {
  const [approvals, setApprovals] = useState<PendingLeaveApproval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchPendingLeaveApprovals(controller.signal)
      .then(setApprovals)
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to load pending approvals.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, []);

  function removeFromList(leaveRequestId: string) {
    setApprovals((current) => current.filter((approval) => approval.leaveRequestId !== leaveRequestId));
  }

  return { approvals, isLoading, error, removeFromList };
}
