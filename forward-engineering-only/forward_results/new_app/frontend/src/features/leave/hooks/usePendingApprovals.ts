import { useCallback, useEffect, useState } from 'react';
import { leaveRequestApi } from '../api/leaveRequestApi';
import type { LeaveRequestDto } from '../types/leaveRequest';

const POLL_INTERVAL_MS = 30_000;

export function usePendingApprovals() {
  const [items, setItems] = useState<LeaveRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      const data = await leaveRequestApi.fetchPendingApprovals();
      setItems(data);
      setError(null);
    } catch {
      setError('Unable to load pending approvals.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
    const timer = setInterval(refetch, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refetch]);

  return { items, count: items.length, loading, error, refetch };
}
