import { useState } from 'react';
import { AuditEntry } from '../types/audit';
import { AuditStatusBadge } from './AuditStatusBadge';

export interface AuditEntryRowProps {
  entry: AuditEntry;
}

export function AuditEntryRow({ entry }: AuditEntryRowProps) {
  const [expanded, setExpanded] = useState(false);
  const hasChangeDetails = !!entry.changeDetails && Object.keys(entry.changeDetails).length > 0;

  return (
    <>
      <tr>
        <td>{new Date(entry.occurredAt).toLocaleString()}</td>
        <td>{entry.actorName}</td>
        <td>{entry.action}</td>
        <td>
          {entry.entityType} <span className="audit-entry-row__id">#{entry.entityId}</span>
        </td>
        <td>
          <AuditStatusBadge result={entry.result} />
        </td>
        <td>{entry.summary}</td>
        <td>
          {hasChangeDetails && (
            <button
              type="button"
              className="audit-entry-row__toggle"
              aria-expanded={expanded}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? 'Hide details' : 'Show details'}
            </button>
          )}
        </td>
      </tr>
      {expanded && hasChangeDetails && (
        <tr className="audit-entry-row__details-row">
          <td colSpan={7}>
            <dl className="audit-entry-row__details">
              {Object.entries(entry.changeDetails!).map(([field, change]) => (
                <div key={field} className="audit-entry-row__detail-item">
                  <dt>{field}</dt>
                  <dd>
                    <span className="audit-entry-row__before">{change.before ?? '—'}</span>
                    {' → '}
                    <span className="audit-entry-row__after">{change.after ?? '—'}</span>
                  </dd>
                </div>
              ))}
            </dl>
            {entry.traceId && <p className="audit-entry-row__trace">Trace ID: {entry.traceId}</p>}
          </td>
        </tr>
      )}
    </>
  );
}
