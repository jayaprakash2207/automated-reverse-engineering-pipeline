import { AuditLogEntry } from '../types/auditLog';

interface AuditLogTableProps {
  entries: AuditLogEntry[];
  onSelectEntry: (entry: AuditLogEntry) => void;
}

export function AuditLogTable({ entries, onSelectEntry }: AuditLogTableProps) {
  if (entries.length === 0) {
    return <p>No audit log entries match the current filters.</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th scope="col">Occurred at</th>
          <th scope="col">Actor</th>
          <th scope="col">Action</th>
          <th scope="col">Entity</th>
          <th scope="col">Status</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id}>
            <td>
              <button type="button" onClick={() => onSelectEntry(entry)}>
                {new Date(entry.occurredAt).toLocaleString()}
              </button>
            </td>
            <td>{entry.actorName}</td>
            <td>{entry.action}</td>
            <td>
              {entry.entityType} #{entry.entityId}
            </td>
            <td>{entry.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
