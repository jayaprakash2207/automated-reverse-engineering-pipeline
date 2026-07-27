import { httpClient } from '../../../shared/api/httpClient';
import type {
  CreateLeaveRequestRequest,
  LeaveRequestActionResponse,
  LeaveRequestCancelResponse,
  LeaveRequestDto,
  LeaveRequestSubmittedResponse,
} from '../types/leaveRequest';

export const leaveRequestApi = {
  fetchMine: () => httpClient.get<LeaveRequestDto[]>('/leave-requests/mine'),
  fetchPendingApprovals: () => httpClient.get<LeaveRequestDto[]>('/leave-requests/pending-approvals'),
  create: (req: CreateLeaveRequestRequest) =>
    httpClient.post<LeaveRequestSubmittedResponse>('/leave-requests', req),
  approve: (id: number) => httpClient.post<LeaveRequestActionResponse>(`/leave-requests/${id}/approve`),
  reject: (id: number, reason: string) =>
    httpClient.post<LeaveRequestActionResponse>(`/leave-requests/${id}/reject`, { reason }),
  cancel: (id: number) => httpClient.post<LeaveRequestCancelResponse>(`/leave-requests/${id}/cancel`),
};
