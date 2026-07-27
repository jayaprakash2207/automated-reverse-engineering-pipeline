export type AuditResult = 'SUCCESS' | 'FAILURE';

export interface AuditChange {
  before: string | null;
  after: string | null;
}

export interface AuditEntry {
  id: string;
  occurredAt: string;
  actorId: string;
  actorName: string;
  entityType: string;
  entityId: string;
  action: string;
  result: AuditResult;
  summary: string;
  traceId?: string;
  changeDetails?: Record<string, AuditChange>;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface AuditTrailQuery {
  entityType: string;
  entityId: string;
  page?: number;
  size?: number;
}

export interface AuditSearchFilters {
  entityType?: string;
  entityId?: string;
  actorId?: string;
  action?: string;
  result?: AuditResult;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  size: number;
}
