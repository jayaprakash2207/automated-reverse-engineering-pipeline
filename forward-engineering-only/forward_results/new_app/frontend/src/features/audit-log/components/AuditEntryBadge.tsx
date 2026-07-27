import type { AuditActionResult } from '../types/auditLog';

interface AuditEntryBadgeProps {
  auditEntryId: string;
  result?: AuditActionResult;
}

// Reused outside this feature (e.g. leave-approval confirmation, per UI/UX Doc 20
// §2) to surface the audit_entry_id at the point of action, not just in this viewer.
export function AuditEntryBadge({ auditEntryId, result = 'SUCCESS' }: AuditEntryBadgeProps) {
  return (
    <span
      className={`audit-entry-badge audit-entry-badge--${result.toLowerCase()}`}
      title="Audit entry recorded for this action"
    >
      Audit ID: {auditEntryId}
    </span>
  );
}
