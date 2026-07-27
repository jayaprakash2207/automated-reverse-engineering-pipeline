import { useCallback, useEffect, useState } from 'react';
import { employeeApi } from '../api/employeeApi';
import { ApiError } from '../../../shared/types/apiError';
import { EmployeeDto } from '../types/employee';

export function useEmployee(id: number) {
  const [employee, setEmployee] = useState<EmployeeDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    employeeApi
      .getById(id, controller.signal)
      .then(setEmployee)
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError) setError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return { employee, loading, error, reload };
}
