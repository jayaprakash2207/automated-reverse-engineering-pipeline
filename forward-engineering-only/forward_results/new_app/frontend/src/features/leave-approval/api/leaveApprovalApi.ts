// Assumed endpoints per Stack Mapping Contract row 3. No backend reference files
// were recorded for this sprint — leave-request endpoints belong to a separate
// backend sprint; adjust paths below if the implemented controller differs.
import { apiRequest } from '../../../shared/api/httpClient';
import { ActionApiResponse } from '../../../shared/types/actionResult';
import { PendingLeaveApproval } from '../types/leaveApproval';

export function fetchPendingLeaveApprovals(signal?: AbortSignal): Promise<PendingLeaveApproval[]> {
  return apiRequest<PendingLeaveApproval[]>('/leave-requests?status=PENDING', { signal });
}

export function approveLeaveRequest(leaveRequestId: string): Promise<ActionApiResponse> {
  return apiRequest<ActionApiResponse>(`/leave-requests/${leaveRequestId}/approval`, {
    method: 'POST',
    body: { decision: 'APPROVED' },
  });
}

export function rejectLeaveRequest(leaveRequestId: string, reason: string): Promise<ActionApiResponse> {
  return apiRequest<ActionApiResponse>(`/leave-requests/${leaveRequestId}/approval`, {
    method: 'POST',
    body: { decision: 'REJECTED', reason },
  });
}
