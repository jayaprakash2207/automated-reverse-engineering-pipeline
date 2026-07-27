import { useEffect, useState } from 'react';
import { payPeriodApi } from '../api/payPeriodApi';
import { PayPeriod } from '../types/payPeriod';
import { ApiError } from '../../../shared/api/types';

interface UsePayPeriodsResult {
  payPeriods: PayPeriod[];
  isLoading: boolean;
  error: ApiError | null;
  reload: () => void;
}

export function usePayPeriods(): UsePayPeriodsResult {
  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    payPeriodApi
      .list()
      .then((data) => {
        if (!cancelled) setPayPeriods(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err : new ApiError('Failed to load pay periods.', 0));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return { payPeriods, isLoading, error, reload: () => setReloadToken((t) => t + 1) };
}
