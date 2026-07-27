export type LeaveType = 'ANNUAL' | 'SICK' | 'UNPAID' | 'BEREAVEMENT' | 'PARENTAL' | 'OTHER';

export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveRequestDto {
  id: number;
  employeeId: number;
  employeeName: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  daysRequested: number;
  status: LeaveRequestStatus;
  reason: string;
  rejectionReason?: string | null;
  balanceAfterRequest: number;
  createdAt: string;
  decidedAt?: string | null;
  decidedByName?: string | null;
}

export interface CreateLeaveRequestRequest {
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface RejectLeaveRequestRequest {
  reason: string;
}

export interface LeaveRequestActionResponse {
  leaveRequest: LeaveRequestDto;
  auditEntryId: string;
}

export interface LeaveRequestSubmittedResponse {
  leaveRequest: LeaveRequestDto;
  auditEntryId: string;
}

export interface LeaveRequestCancelResponse {
  leaveRequest: LeaveRequestDto;
  auditEntryId: string;
}
