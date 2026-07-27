import { useCallback, useEffect, useState } from 'react';
import { ApiError, NetworkError } from '../../../shared/api/apiClient';
import { fetchAuditLogs } from '../api/auditLogApi';
import type { AuditLogPage, AuditLogQueryParams } from '../types/auditLog';

interface UseAuditLogsState {
  data: AuditLogPage | null;
  loading: boolean;
  error: string | null;
}

const DEFAULT_PAGE_SIZE = 25;

export function useAuditLogs(filters: Omit<AuditLogQueryParams, 'page' | 'size'>) {
  const [page, setPage] = useState(0);
  const [state, setState] = useState<UseAuditLogsState>({ data: null, loading: true, error: null });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetchAuditLogs({ ...filters, page, size: DEFAULT_PAGE_SIZE });
      setState({ data, loading: false, error: null });
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof NetworkError ? error.message : 'Unable to load audit logs.';
      setState({ data: null, loading: false, error: message });
    }
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [filters.actorEmail, filters.entityType, filters.fromDate, filters.toDate]);

  return { ...state, page, setPage, refetch: load };
}
