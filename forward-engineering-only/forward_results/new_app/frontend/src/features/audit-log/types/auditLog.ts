export type AuditActionResult = 'SUCCESS' | 'FAILURE';

export interface AuditLogEntry {
  id: string;
  occurredAt: string;
  actorId: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  result: AuditActionResult;
  traceId?: string;
  details?: string;
}

export interface AuditLogQueryParams {
  actorEmail?: string;
  entityType?: string;
  fromDate?: string;
  toDate?: string;
  page: number;
  size: number;
}

export interface AuditLogPage {
  content: AuditLogEntry[];
  totalElements: number;
  page: number;
  size: number;
}
