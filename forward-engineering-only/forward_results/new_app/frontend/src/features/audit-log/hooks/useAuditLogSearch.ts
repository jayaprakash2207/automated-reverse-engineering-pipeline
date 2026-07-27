import { useCallback, useEffect, useState } from 'react';
import { searchAuditEntries } from '../../../shared/audit/api/auditApi';
import { AuditEntry, AuditSearchFilters, PagedResponse } from '../../../shared/audit/types/audit';
import { ApiError } from '../../../shared/api/apiError';

const DEFAULT_PAGE_SIZE = 25;

export const emptyFilters: AuditSearchFilters = {
  page: 0,
  size: DEFAULT_PAGE_SIZE,
};

export interface UseAuditLogSearchResult {
  filters: AuditSearchFilters;
  setFilters: (filters: AuditSearchFilters) => void;
  page: PagedResponse<AuditEntry> | undefined;
  isLoading: boolean;
  error: string | undefined;
  goToPage: (pageNumber: number) => void;
}

export function useAuditLogSearch(): UseAuditLogSearchResult {
  const [filters, setFilters] = useState<AuditSearchFilters>(emptyFilters);
  const [page, setPage] = useState<PagedResponse<AuditEntry>>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(undefined);

    searchAuditEntries(filters)
      .then((result) => {
        if (!cancelled) {
          setPage(result);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message =
            err instanceof ApiError ? err.message : 'Unable to search the audit log. Please try again.';
          setError(message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [filters]);

  const goToPage = useCallback((pageNumber: number) => {
    setFilters((current) => ({ ...current, page: pageNumber }));
  }, []);

  return { filters, setFilters, page, isLoading, error, goToPage };
}
