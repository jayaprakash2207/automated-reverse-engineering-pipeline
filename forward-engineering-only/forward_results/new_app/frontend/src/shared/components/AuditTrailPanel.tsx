import { AuditLogEntry } from '../types/auditLog';

interface AuditTrailPanelProps {
  entries: AuditLogEntry[];
  isLoading?: boolean;
  emptyMessage?: string;
}

// Embeddable audit history table — reused by the audit-log feature's search screen
// and intended for reuse on any entity detail screen (employee history, leave
// request detail, etc.) in future sprints.
export function AuditTrailPanel({ entries, isLoading, emptyMessage }: AuditTrailPanelProps) {
  if (isLoading) {
    return <p role="status">Loading audit trail…</p>;
  }

  if (entries.length === 0) {
    return <p>{emptyMessage ?? 'No audit history recorded for this item yet.'}</p>;
  }

  return (
    <table className="audit-trail-panel" aria-label="Audit trail">
      <thead>
        <tr>
          <th scope="col">When</th>
          <th scope="col">Who</th>
          <th scope="col">Action</th>
          <th scope="col">Result</th>
          <th scope="col">Audit ID</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.auditEntryId}>
            <td>{new Date(entry.occurredAt).toLocaleString()}</td>
            <td>{entry.actorName}</td>
            <td>{entry.action}</td>
            <td>{entry.outcome}</td>
            <td>
              <code>{entry.auditEntryId}</code>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
