import { useCallback, useEffect, useState } from 'react';
import { fetchAuditTrail } from '../api/auditApi';
import { AuditEntry, PagedResponse } from '../types/audit';
import { ApiError } from '../../api/apiError';

export interface UseAuditTrailResult {
  entries: AuditEntry[];
  page: PagedResponse<AuditEntry> | undefined;
  isLoading: boolean;
  error: string | undefined;
  reload: () => void;
}

export function useAuditTrail(
  entityType: string,
  entityId: string,
  pageNumber = 0,
  pageSize = 20,
): UseAuditTrailResult {
  const [page, setPage] = useState<PagedResponse<AuditEntry>>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(undefined);

    fetchAuditTrail({ entityType, entityId, page: pageNumber, size: pageSize })
      .then((result) => {
        if (!cancelled) {
          setPage(result);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message =
            err instanceof ApiError ? err.message : 'Unable to load the audit trail. Please try again.';
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
  }, [entityType, entityId, pageNumber, pageSize, reloadToken]);

  return { entries: page?.content ?? [], page, isLoading, error, reload };
}
