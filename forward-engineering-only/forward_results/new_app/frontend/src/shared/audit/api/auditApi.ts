import { apiFetch } from '../../api/httpClient';
import { AuditEntry, AuditSearchFilters, AuditTrailQuery, PagedResponse } from '../types/audit';

function toQueryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

/** Audit history scoped to a single record — embedded in other features' detail screens. */
export function fetchAuditTrail(query: AuditTrailQuery): Promise<PagedResponse<AuditEntry>> {
  const qs = toQueryString({
    entityType: query.entityType,
    entityId: query.entityId,
    page: query.page ?? 0,
    size: query.size ?? 20,
  });
  return apiFetch<PagedResponse<AuditEntry>>(`/audit-entries${qs}`);
}

/** Unscoped search across all recorded actions — powers the Audit Log admin screen. */
export function searchAuditEntries(filters: AuditSearchFilters): Promise<PagedResponse<AuditEntry>> {
  const qs = toQueryString({
    entityType: filters.entityType,
    entityId: filters.entityId,
    actorId: filters.actorId,
    action: filters.action,
    result: filters.result,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    page: filters.page,
    size: filters.size,
  });
  return apiFetch<PagedResponse<AuditEntry>>(`/audit-entries${qs}`);
}
