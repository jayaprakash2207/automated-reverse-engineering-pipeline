import { useEffect, useState } from 'react';
import { payrollRunApi } from '../api/payrollRunApi';
import { PayrollRun } from '../types/payrollRun';
import { ApiError } from '../../../shared/api/types';

interface UsePayrollRunsResult {
  payrollRuns: PayrollRun[];
  isLoading: boolean;
  error: ApiError | null;
  reload: () => void;
}

export function usePayrollRuns(): UsePayrollRunsResult {
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    payrollRunApi
      .list()
      .then((data) => {
        if (!cancelled) setPayrollRuns(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err : new ApiError('Failed to load payroll runs.', 0));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return { payrollRuns, isLoading, error, reload: () => setReloadToken((t) => t + 1) };
}
