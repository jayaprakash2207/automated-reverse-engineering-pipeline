export interface PendingLeaveApproval {
  leaveRequestId: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  daysRequested: number;
  balanceAfterApproval: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}
