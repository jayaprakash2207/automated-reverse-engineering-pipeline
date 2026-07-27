import { apiRequest } from '../../../shared/api/apiClient';
import type { AuditLogPage, AuditLogQueryParams } from '../types/auditLog';

export function fetchAuditLogs(params: AuditLogQueryParams): Promise<AuditLogPage> {
  return apiRequest<AuditLogPage>('/audit-logs', {
    method: 'GET',
    query: {
      actorEmail: params.actorEmail,
      entityType: params.entityType,
      fromDate: params.fromDate,
      toDate: params.toDate,
      page: params.page,
      size: params.size,
    },
  });
}
