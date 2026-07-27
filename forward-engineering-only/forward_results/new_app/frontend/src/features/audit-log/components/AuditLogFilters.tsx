import { useState, type FormEvent } from 'react';
import type { AuditLogQueryParams } from '../types/auditLog';

type FilterValues = Omit<AuditLogQueryParams, 'page' | 'size'>;

interface AuditLogFiltersProps {
  onApply: (filters: FilterValues) => void;
}

export function AuditLogFilters({ onApply }: AuditLogFiltersProps) {
  const [actorEmail, setActorEmail] = useState('');
  const [entityType, setEntityType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onApply({
      actorEmail: actorEmail || undefined,
      entityType: entityType || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="audit-log-filters" aria-label="Filter audit logs">
      <label>
        Actor email
        <input value={actorEmail} onChange={(e) => setActorEmail(e.target.value)} type="email" />
      </label>
      <label>
        Entity type
        <input value={entityType} onChange={(e) => setEntityType(e.target.value)} type="text" />
      </label>
      <label>
        From
        <input value={fromDate} onChange={(e) => setFromDate(e.target.value)} type="date" />
      </label>
      <label>
        To
        <input value={toDate} onChange={(e) => setToDate(e.target.value)} type="date" />
      </label>
      <button type="submit">Apply filters</button>
    </form>
  );
}
