import { useEffect, useState } from 'react';
import { getEmployeeHistory } from '../api/employeeApi';
import type { EmployeeHistoryEntry } from '../types/employee';

interface UseEmployeeHistoryResult {
  history: EmployeeHistoryEntry[];
  loading: boolean;
  error: string | null;
}

export function useEmployeeHistory(employeeId: number, refreshKey = 0): UseEmployeeHistoryResult {
  const [history, setHistory] = useState<EmployeeHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getEmployeeHistory(employeeId)
      .then((result) => {
        if (!cancelled) {
          const sorted = [...result].sort(
            (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime(),
          );
          setHistory(sorted);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Unable to load employee history.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [employeeId, refreshKey]);

  return { history, loading, error };
}
