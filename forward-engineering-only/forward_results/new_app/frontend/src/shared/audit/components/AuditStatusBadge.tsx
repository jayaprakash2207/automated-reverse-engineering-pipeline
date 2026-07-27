import { AuditResult } from '../types/audit';

export interface AuditStatusBadgeProps {
  result: AuditResult;
}

export function AuditStatusBadge({ result }: AuditStatusBadgeProps) {
  const isSuccess = result === 'SUCCESS';
  return (
    <span className={`audit-status-badge audit-status-badge--${isSuccess ? 'success' : 'failure'}`}>
      <span aria-hidden="true">{isSuccess ? '✓' : '✕'}</span>
      {isSuccess ? 'Success' : 'Failure'}
    </span>
  );
}
