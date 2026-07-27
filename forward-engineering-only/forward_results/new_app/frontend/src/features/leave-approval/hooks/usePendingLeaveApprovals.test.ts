import { renderHook, waitFor, act } from '@testing-library/react';
import { usePendingLeaveApprovals } from './usePendingLeaveApprovals';
import * as leaveApprovalApi from '../api/leaveApprovalApi';

jest.mock('../api/leaveApprovalApi');

const APPROVAL_A = {
  leaveRequestId: 'l1',
  employeeName: 'Dana Kim',
  leaveType: 'PTO',
  startDate: '2026-08-01',
  endDate: '2026-08-02',
  daysRequested: 1,
  balanceAfterApproval: 9,
  status: 'PENDING' as const,
};

const APPROVAL_B = {
  ...APPROVAL_A,
  leaveRequestId: 'l2',
  employeeName: 'Alex Chen',
};

describe('usePendingLeaveApprovals', () => {
  it('starts loading and then populates approvals from the fetch', async () => {
    jest.spyOn(leaveApprovalApi, 'fetchPendingLeaveApprovals').mockResolvedValue([APPROVAL_A, APPROVAL_B]);

    const { result } = renderHook(() => usePendingLeaveApprovals());
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.approvals).toEqual([APPROVAL_A, APPROVAL_B]);
    expect(result.current.error).toBeNull();
  });

  it('surfaces a readable error message when the fetch fails', async () => {
    jest.spyOn(leaveApprovalApi, 'fetchPendingLeaveApprovals').mockRejectedValue(new Error('service unavailable'));

    const { result } = renderHook(() => usePendingLeaveApprovals());

    await waitFor(() => expect(result.current.error).toBe('service unavailable'));
    expect(result.current.approvals).toEqual([]);
  });

  it('removeFromList filters only the named approval out of local state, without refetching', async () => {
    const fetchSpy = jest
      .spyOn(leaveApprovalApi, 'fetchPendingLeaveApprovals')
      .mockResolvedValue([APPROVAL_A, APPROVAL_B]);

    const { result } = renderHook(() => usePendingLeaveApprovals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.removeFromList('l1');
    });

    expect(result.current.approvals).toEqual([APPROVAL_B]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('aborts the in-flight request on unmount', () => {
    const abortSpy = jest.spyOn(AbortController.prototype, 'abort');
    jest.spyOn(leaveApprovalApi, 'fetchPendingLeaveApprovals').mockReturnValue(new Promise(() => {}));

    const { unmount } = renderHook(() => usePendingLeaveApprovals());
    unmount();

    expect(abortSpy).toHaveBeenCalled();
    abortSpy.mockRestore();
  });
});
