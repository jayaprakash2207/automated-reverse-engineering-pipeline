import { useAuditTrail } from '../hooks/useAuditTrail';
import { AuditEntryRow } from './AuditEntryRow';
import './AuditTrail.css';

export interface AuditTrailProps {
  entityType: string;
  entityId: string;
  title?: string;
}

/**
 * Reusable, embeddable audit history panel. Feature screens (leave requests, employee
 * lifecycle actions, etc.) drop this in next to a record's detail view rather than
 * re-implementing audit-trail rendering per feature.
 */
export function AuditTrail({ entityType, entityId, title = 'Audit history' }: AuditTrailProps) {
  const { entries, isLoading, error, reload } = useAuditTrail(entityType, entityId);

  return (
    <section className="audit-trail" aria-labelledby="audit-trail-heading">
      <h3 id="audit-trail-heading">{title}</h3>

      {isLoading && <p role="status">Loading audit history…</p>}

      {!isLoading && error && (
        <div className="audit-trail__error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={reload}>
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && entries.length === 0 && (
        <p className="audit-trail__empty">No recorded actions yet for this record.</p>
      )}

      {!isLoading && !error && entries.length > 0 && (
        <table className="audit-trail__table">
          <caption className="audit-trail__caption">
            Actions recorded for {entityType} #{entityId}
          </caption>
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">By</th>
              <th scope="col">Action</th>
              <th scope="col">Record</th>
              <th scope="col">Result</th>
              <th scope="col">Summary</th>
              <th scope="col">
                <span className="audit-trail__sr-only">Details</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <AuditEntryRow key={entry.id} entry={entry} />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
