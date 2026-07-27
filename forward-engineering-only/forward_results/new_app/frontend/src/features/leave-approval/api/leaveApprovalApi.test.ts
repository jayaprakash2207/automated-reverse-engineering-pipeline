import { apiRequest } from '../../../shared/api/httpClient';
import { fetchPendingLeaveApprovals, approveLeaveRequest, rejectLeaveRequest } from './leaveApprovalApi';

jest.mock('../../../shared/api/httpClient');

const mockApiRequest = apiRequest as jest.Mock;

describe('leaveApprovalApi', () => {
  it('fetchPendingLeaveApprovals requests only PENDING leave requests', async () => {
    mockApiRequest.mockResolvedValue([]);

    await fetchPendingLeaveApprovals();

    expect(mockApiRequest).toHaveBeenCalledWith('/leave-requests?status=PENDING', { signal: undefined });
  });

  it('fetchPendingLeaveApprovals forwards an abort signal', async () => {
    mockApiRequest.mockResolvedValue([]);
    const controller = new AbortController();

    await fetchPendingLeaveApprovals(controller.signal);

    expect(mockApiRequest).toHaveBeenCalledWith('/leave-requests?status=PENDING', { signal: controller.signal });
  });

  it('approveLeaveRequest posts an APPROVED decision to the approval endpoint for that request', async () => {
    mockApiRequest.mockResolvedValue({ status: 'SUCCESS', auditEntryId: 'audit-1' });

    await approveLeaveRequest('leave-1');

    expect(mockApiRequest).toHaveBeenCalledWith('/leave-requests/leave-1/approval', {
      method: 'POST',
      body: { decision: 'APPROVED' },
    });
  });

  it('rejectLeaveRequest posts a REJECTED decision with the supplied reason', async () => {
    mockApiRequest.mockResolvedValue({ status: 'SUCCESS', auditEntryId: 'audit-2' });

    await rejectLeaveRequest('leave-1', 'Insufficient staffing coverage that week.');

    expect(mockApiRequest).toHaveBeenCalledWith('/leave-requests/leave-1/approval', {
      method: 'POST',
      body: { decision: 'REJECTED', reason: 'Insufficient staffing coverage that week.' },
    });
  });

  it('scopes approve/reject to the specific leaveRequestId, never a different request', async () => {
    mockApiRequest.mockResolvedValue({ status: 'SUCCESS', auditEntryId: 'audit-3' });

    await approveLeaveRequest('leave-42');

    expect(mockApiRequest.mock.calls[0][0]).toBe('/leave-requests/leave-42/approval');
  });
});
