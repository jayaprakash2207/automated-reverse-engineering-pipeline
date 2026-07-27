import { useEffect, useState } from 'react';
import { payrollRunApi } from '../api/payrollRunApi';
import { PayrollRun } from '../types/payrollRun';
import { ApiError } from '../../../shared/api/types';

interface UsePayrollRunDetailResult {
  payrollRun: PayrollRun | null;
  isLoading: boolean;
  error: ApiError | null;
  reload: () => void;
}

export function usePayrollRunDetail(runId: number): UsePayrollRunDetailResult {
  const [payrollRun, setPayrollRun] = useState<PayrollRun | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (Number.isNaN(runId)) {
      setIsLoading(false);
      setError(new ApiError('Invalid payroll run id.', 400));
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    payrollRunApi
      .getById(runId)
      .then((data) => {
        if (!cancelled) setPayrollRun(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err : new ApiError('Failed to load payroll run.', 0));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [runId, reloadToken]);

  return { payrollRun, isLoading, error, reload: () => setReloadToken((t) => t + 1) };
}
