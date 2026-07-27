import { useCallback, useEffect, useState } from 'react';
import { getEmployee } from '../api/employeeApi';
import type { Employee } from '../types/employee';

interface UseEmployeeResult {
  employee: Employee | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useEmployee(id: number): UseEmployeeResult {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchToken, setRefetchToken] = useState(0);

  const refetch = useCallback(() => setRefetchToken((token) => token + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getEmployee(id)
      .then((result) => {
        if (!cancelled) setEmployee(result);
      })
      .catch(() => {
        if (!cancelled) setError('Unable to load this employee.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, refetchToken]);

  return { employee, loading, error, refetch };
}
