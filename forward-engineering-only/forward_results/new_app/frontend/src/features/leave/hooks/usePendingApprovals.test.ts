import { renderHook, waitFor } from '@testing-library/react';
import { usePendingApprovals } from './usePendingApprovals';
import { leaveRequestApi } from '../api/leaveRequestApi';
import { ApiError } from '../../../shared/api/apiError';
import type { LeaveRequestDto } from '../types/leaveRequest';

jest.mock('../api/leaveRequestApi', () => ({
  leaveRequestApi: {
    listPendingApprovals: jest.fn(),
  },
}));

const mockedApi = leaveRequestApi as jest.Mocked<typeof leaveRequestApi>;

function pendingDto(id: string): LeaveRequestDto {
  return {
    id,
    employeeId: '100',
    leaveType: 'ANNUAL',
    startDate: '2026-08-10',
    endDate: '2026-08-12',
    daysRequested: 3,
    reason: 'Family trip',
    status: 'PENDING',
    managerId: '900',
    createdAt: '2026-07-24T00:00:00Z',
  };
}

describe('usePendingApprovals', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('loads the manager pending-approvals queue', async () => {
    mockedApi.listPendingApprovals.mockResolvedValueOnce([pendingDto('lr-1'), pendingDto('lr-2')]);

    const { result } = renderHook(() => usePendingApprovals());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toHaveLength(2);
    expect(mockedApi.listPendingApprovals).toHaveBeenCalledTimes(1);
  });

  it('returns an empty queue when the manager has no direct reports pending', async () => {
    mockedApi.listPendingApprovals.mockResolvedValueOnce([]);

    const { result } = renderHook(() => usePendingApprovals());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('surfaces a 403 as an error without throwing (defensive: not a manager)', async () => {
    mockedApi.listPendingApprovals.mockRejectedValueOnce(
      new ApiError({
        status: 403,
        errorCode: 'FORBIDDEN',
        message: 'You do not have permission to view this resource.',
        timestamp: '2026-07-24T00:00:00Z',
        path: '/leave-requests/pending-approvals',
      })
    );

    const { result } = renderHook(() => usePendingApprovals());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('You do not have permission to view this resource.');
  });
});
