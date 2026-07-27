import { useState } from 'react';
import { useAuth } from '../../../shared/auth/useAuth';
import { NotAuthorized } from '../../../shared/components/NotAuthorized';
import { ROLES } from '../../../shared/auth/roles';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { AuditLogFilters } from './AuditLogFilters';
import { AuditEntryBadge } from './AuditEntryBadge';
import type { AuditLogQueryParams } from '../types/auditLog';

type FilterValues = Omit<AuditLogQueryParams, 'page' | 'size'>;

// Defense-in-depth role check in addition to the RequireRole route guard
// (AuditLogPage): the RBAC table (Security Architecture §3) restricts audit-log
// reads to the System/Audit Reviewer role only — Employee/Manager must never
// reach this view, even if rendered directly.
export function AuditLogViewer() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<FilterValues>({});
  const { data, loading, error, page, setPage, refetch } = useAuditLogs(filters);

  if (!user || !user.roles.includes(ROLES.SYSTEM_AUDIT_REVIEWER)) {
    return <NotAuthorized />;
  }

  return (
    <section aria-label="Audit log viewer">
      <h1>Audit Log</h1>
      <AuditLogFilters onApply={setFilters} />

      {loading && <p role="status">Loading audit entries...</p>}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button type="button" onClick={refetch}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Result</th>
                <th>Audit ID</th>
              </tr>
            </thead>
            <tbody>
              {data.content.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.occurredAt}</td>
                  <td>{entry.actorEmail}</td>
                  <td>{entry.action}</td>
                  <td>
                    {entry.entityType} #{entry.entityId}
                  </td>
                  <td>{entry.result}</td>
                  <td>
                    <AuditEntryBadge auditEntryId={entry.id} result={entry.result} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data.content.length === 0 && <p>No audit entries match the current filters.</p>}

          <div className="audit-log-pagination">
            <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <span>Page {page + 1}</span>
            <button
              type="button"
              disabled={(page + 1) * data.size >= data.totalElements}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </section>
  );
}
