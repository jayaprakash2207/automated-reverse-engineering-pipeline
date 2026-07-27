import type { LeaveRequestStatus } from '../types/leaveRequest';

const STATUS_LABEL: Record<LeaveRequestStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

const STATUS_COLOR: Record<LeaveRequestStatus, string> = {
  PENDING: '#8a6d00',
  APPROVED: '#1a7f37',
  REJECTED: '#b31412',
  CANCELLED: '#57606a',
};

export function LeaveStatusBadge({ status }: { status: LeaveRequestStatus }) {
  const color = STATUS_COLOR[status];
  return (
    <span
      role="status"
      style={{
        color,
        border: `1px solid ${color}`,
        borderRadius: 4,
        padding: '2px 8px',
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
