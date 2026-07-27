export interface AuditLogFilters {
  actorName?: string;
  entityType?: string;
  entityId?: string;
  fromDate?: string;
  toDate?: string;
  outcome?: 'SUCCESS' | 'FAILURE';
}
