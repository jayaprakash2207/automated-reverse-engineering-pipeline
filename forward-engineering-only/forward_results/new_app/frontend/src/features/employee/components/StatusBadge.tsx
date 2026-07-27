import type { EmployeeStatus } from '../types/employee';

const LABELS: Record<EmployeeStatus, string> = {
  ACTIVE: 'Active',
  ON_LEAVE: 'On Leave',
  TERMINATED: 'Terminated',
};

export function StatusBadge({ status }: { status: EmployeeStatus }) {
  return <span className={`status-badge status-badge--${status.toLowerCase()}`}>{LABELS[status]}</span>;
}
