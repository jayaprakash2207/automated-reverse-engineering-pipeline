import type { EmployeeHistoryEntry } from '../types/employee';

const CHANGE_LABELS: Record<EmployeeHistoryEntry['changeType'], string> = {
  HIRE: 'Hired',
  TRANSFER: 'Transferred',
  PROMOTION: 'Promoted',
  TERMINATION: 'Terminated',
  REHIRE: 'Rehired',
};

function describeChange(entry: EmployeeHistoryEntry): string {
  const parts: string[] = [];
  if (entry.previousDepartment && entry.newDepartment && entry.previousDepartment !== entry.newDepartment) {
    parts.push(`${entry.previousDepartment} → ${entry.newDepartment}`);
  }
  if (entry.previousJobTitle && entry.newJobTitle && entry.previousJobTitle !== entry.newJobTitle) {
    parts.push(`${entry.previousJobTitle} → ${entry.newJobTitle}`);
  }
  return parts.join('; ');
}

export function EmployeeHistoryTimeline({ history }: { history: EmployeeHistoryEntry[] }) {
  if (history.length === 0) {
    return <p>No history recorded yet.</p>;
  }

  return (
    <ol className="history-timeline" aria-label="Employee change history">
      {history.map((entry) => (
        <li key={entry.id} className="history-timeline__entry">
          <p>
            <strong>{CHANGE_LABELS[entry.changeType]}</strong> effective {entry.effectiveDate}
          </p>
          {describeChange(entry) && <p>{describeChange(entry)}</p>}
          {entry.reason && <p>Reason: {entry.reason}</p>}
          <p className="history-timeline__meta">
            Recorded {new Date(entry.changedAt).toLocaleString()} by {entry.changedBy}
          </p>
        </li>
      ))}
    </ol>
  );
}
