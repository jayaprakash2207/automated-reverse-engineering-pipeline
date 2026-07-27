import { useCallback, useEffect, useState } from 'react';
import { employeeApi } from '../api/employeeApi';
import { ApiError } from '../../../shared/types/apiError';
import { EmployeeHistoryDto } from '../types/employee';

export function useEmployeeHistory(employeeId: number) {
  const [history, setHistory] = useState<EmployeeHistoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    employeeApi
      .getHistory(employeeId, controller.signal)
      .then((entries) => {
        const sorted = [...entries].sort((a, b) => b.effective_date.localeCompare(a.effective_date));
        setHistory(sorted);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError) setError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [employeeId, reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return { history, loading, error, reload };
}
