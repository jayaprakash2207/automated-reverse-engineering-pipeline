import { FormEvent, useState } from 'react';
import { AuditLogFilters } from '../types/auditLogFilters';

interface AuditLogFilterBarProps {
  initialFilters: AuditLogFilters;
  onApply: (filters: AuditLogFilters) => void;
}

export function AuditLogFilterBar({ initialFilters, onApply }: AuditLogFilterBarProps) {
  const [draft, setDraft] = useState<AuditLogFilters>(initialFilters);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onApply(draft);
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Filter audit log">
      <label htmlFor="actorName">Actor</label>
      <input
        id="actorName"
        type="text"
        value={draft.actorName ?? ''}
        onChange={(e) => setDraft({ ...draft, actorName: e.target.value || undefined })}
      />

      <label htmlFor="entityType">Entity type</label>
      <input
        id="entityType"
        type="text"
        value={draft.entityType ?? ''}
        onChange={(e) => setDraft({ ...draft, entityType: e.target.value || undefined })}
      />

      <label htmlFor="outcome">Result</label>
      <select
        id="outcome"
        value={draft.outcome ?? ''}
        onChange={(e) => setDraft({ ...draft, outcome: (e.target.value || undefined) as AuditLogFilters['outcome'] })}
      >
        <option value="">Any</option>
        <option value="SUCCESS">Success</option>
        <option value="FAILURE">Failure</option>
      </select>

      <button type="submit">Apply filters</button>
    </form>
  );
}
