export interface AuditLogEntry {
  auditEntryId: string;
  occurredAt: string;
  actorName: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  outcome: 'SUCCESS' | 'FAILURE';
  detail?: string;
}
