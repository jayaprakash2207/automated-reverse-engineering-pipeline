import { useCallback, useEffect, useState } from 'react';
import { employeeApi } from '../api/employeeApi';
import { ApiError } from '../../../shared/types/apiError';
import { EmployeeDto, EmployeeListFilters, PageMeta } from '../types/employee';

interface UseEmployeeListResult {
  employees: EmployeeDto[];
  pageMeta: PageMeta | null;
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
}

export function useEmployeeList(filters: EmployeeListFilters): UseEmployeeListResult {
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [pageMeta, setPageMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    employeeApi
      .list(filters, controller.signal)
      .then((response) => {
        setEmployees(response.content);
        setPageMeta(response.page);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError) setError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search, filters.department, filters.status, filters.page, filters.size, reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return { employees, pageMeta, loading, error, reload };
}
