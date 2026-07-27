import { EmployeeStatus } from '../types/employee';

const STATUS_LABELS: Record<EmployeeStatus, string> = {
  ACTIVE: 'Active',
  ON_LEAVE: 'On Leave',
  TERMINATED: 'Terminated',
};

interface EmployeeStatusBadgeProps {
  status: EmployeeStatus;
}

export function EmployeeStatusBadge({ status }: EmployeeStatusBadgeProps) {
  return (
    <span className={`status-badge status-badge--${status.toLowerCase()}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
