import { EmployeeHistoryDto } from '../types/employee';

const CHANGE_TYPE_LABELS: Record<string, string> = {
  HIRE: 'Hired',
  TRANSFER: 'Transferred',
  PROMOTION: 'Promoted',
  TERMINATION: 'Terminated',
  REHIRE: 'Rehired',
};

interface EmployeeHistoryTimelineProps {
  history: EmployeeHistoryDto[];
}

export function EmployeeHistoryTimeline({ history }: EmployeeHistoryTimelineProps) {
  if (history.length === 0) {
    return <p>No history recorded for this employee yet.</p>;
  }

  return (
    <ol className="history-timeline">
      {history.map((entry) => (
        <li key={entry.id} className="history-timeline__entry">
          <p className="history-timeline__type">
            {CHANGE_TYPE_LABELS[entry.change_type] ?? entry.change_type}{' '}
            <span>effective {entry.effective_date}</span>
          </p>
          {entry.previous_value && entry.new_value && (
            <p>
              {entry.previous_value} → {entry.new_value}
            </p>
          )}
          {entry.reason && <p className="history-timeline__reason">Reason: {entry.reason}</p>}
          <p className="history-timeline__meta">
            Recorded by {entry.changed_by} on {entry.changed_at}
          </p>
        </li>
      ))}
    </ol>
  );
}
