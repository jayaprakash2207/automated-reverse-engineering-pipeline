import { useState } from 'react';
import { useCurrentUser } from '../../../shared/hooks/useCurrentUser';
import { AuditLogEntry, AuditLogFilters as AuditLogFiltersValue } from '../types/auditLog';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { AuditLogFilters } from './AuditLogFilters';
import { AuditLogTable } from './AuditLogTable';
import { AuditLogDetailModal } from './AuditLogDetailModal';

const ALLOWED_ROLES = ['ADMIN', 'AUDITOR'];
const DEFAULT_PAGE_SIZE = 25;

export function AuditLogPage() {
  const currentUser = useCurrentUser();
  const [filters, setFilters] = useState<AuditLogFiltersValue>({ page: 0, size: DEFAULT_PAGE_SIZE });
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const { data, isLoading, error } = useAuditLogs(filters);

  const canViewAuditLog = currentUser?.roles.some((role) => ALLOWED_ROLES.includes(role)) ?? false;

  if (!canViewAuditLog) {
    return (
      <section>
        <h1>Audit log</h1>
        <p role="alert">You do not have permission to view the audit log.</p>
      </section>
    );
  }

  return (
    <section>
      <h1>Audit log</h1>
      <AuditLogFilters initialFilters={filters} onApply={setFilters} />

      {isLoading ? <p>Loading audit log entries...</p> : null}
      {error ? <p role="alert">{error}</p> : null}

      {data ? (
        <>
          <AuditLogTable entries={data.content} onSelectEntry={setSelectedEntry} />
          <nav aria-label="Audit log pagination">
            <button
              type="button"
              disabled={data.page <= 0}
              onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page ?? 0) - 1 }))}
            >
              Previous
            </button>
            <span>
              Page {data.page + 1} of {Math.max(data.totalPages, 1)}
            </span>
            <button
              type="button"
              disabled={data.page + 1 >= data.totalPages}
              onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page ?? 0) + 1 }))}
            >
              Next
            </button>
          </nav>
        </>
      ) : null}

      {selectedEntry ? (
        <AuditLogDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      ) : null}
    </section>
  );
}
