import { useCallback, useEffect, useState } from 'react';
import { listEmployees } from '../api/employeeApi';
import type { Employee, EmployeeSearchParams, PageMeta } from '../types/employee';

interface UseEmployeesResult {
  employees: Employee[];
  pageMeta: PageMeta | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useEmployees(params: EmployeeSearchParams): UseEmployeesResult {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pageMeta, setPageMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchToken, setRefetchToken] = useState(0);

  const refetch = useCallback(() => setRefetchToken((token) => token + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listEmployees(params)
      .then((result) => {
        if (cancelled) return;
        setEmployees(result.content);
        setPageMeta(result.page);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Unable to load employees. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.search, params.department, params.status, params.page, params.size, refetchToken]);

  return { employees, pageMeta, loading, error, refetch };
}
