import { AuditLogEntry } from '../types/auditLog';

interface AuditLogDetailModalProps {
  entry: AuditLogEntry;
  onClose: () => void;
}

export function AuditLogDetailModal({ entry, onClose }: AuditLogDetailModalProps) {
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="audit-log-detail-heading">
      <h2 id="audit-log-detail-heading">Audit entry {entry.id}</h2>
      <dl>
        <dt>Occurred at</dt>
        <dd>{new Date(entry.occurredAt).toLocaleString()}</dd>
        <dt>Actor</dt>
        <dd>
          {entry.actorName} ({entry.actorId})
        </dd>
        <dt>Action</dt>
        <dd>{entry.action}</dd>
        <dt>Entity</dt>
        <dd>
          {entry.entityType} #{entry.entityId}
        </dd>
        <dt>Status</dt>
        <dd>{entry.status}</dd>
        <dt>Details</dt>
        <dd>{entry.details}</dd>
        <dt>Trace ID</dt>
        <dd>{entry.traceId}</dd>
      </dl>
      <button type="button" onClick={onClose}>
        Close
      </button>
    </div>
  );
}
