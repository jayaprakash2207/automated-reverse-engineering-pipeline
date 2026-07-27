import { renderHook, waitFor } from '@testing-library/react';
import { useMyLeaveRequests } from './useMyLeaveRequests';
import { leaveRequestApi } from '../api/leaveRequestApi';
import { ApiError } from '../../../shared/api/apiError';
import type { LeaveRequestDto } from '../types/leaveRequest';

jest.mock('../api/leaveRequestApi', () => ({
  leaveRequestApi: {
    listMine: jest.fn(),
  },
}));

const mockedApi = leaveRequestApi as jest.Mocked<typeof leaveRequestApi>;

function sampleDto(overrides: Partial<LeaveRequestDto> = {}): LeaveRequestDto {
  return {
    id: 'lr-1',
    employeeId: '100',
    leaveType: 'ANNUAL',
    startDate: '2026-08-10',
    endDate: '2026-08-12',
    daysRequested: 3,
    reason: 'Family trip',
    status: 'PENDING',
    createdAt: '2026-07-24T00:00:00Z',
    ...overrides,
  };
}

describe('useMyLeaveRequests', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('starts in a loading state and then loads the employee own requests', async () => {
    mockedApi.listMine.mockResolvedValueOnce([sampleDto()]);

    const { result } = renderHook(() => useMyLeaveRequests());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('surfaces a system error message without throwing when the API call fails', async () => {
    mockedApi.listMine.mockRejectedValueOnce(
      new ApiError({
        status: 500,
        errorCode: 'INTERNAL_ERROR',
        message: 'Something went wrong',
        timestamp: '2026-07-24T00:00:00Z',
        path: '/leave-requests/mine',
      })
    );

    const { result } = renderHook(() => useMyLeaveRequests());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBe('Something went wrong');
  });

  it('reload() re-fetches and clears a previous error on success', async () => {
    mockedApi.listMine.mockRejectedValueOnce(
      new ApiError({
        status: 0,
        errorCode: 'NETWORK_ERROR',
        message: 'Unable to reach the server.',
        timestamp: '2026-07-24T00:00:00Z',
        path: '/leave-requests/mine',
      })
    );
    mockedApi.listMine.mockResolvedValueOnce([sampleDto({ status: 'CANCELLED' })]);

    const { result } = renderHook(() => useMyLeaveRequests());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Unable to reach the server.');

    await result.current.reload();

    expect(result.current.error).toBeNull();
    expect(result.current.data[0].status).toBe('CANCELLED');
  });
});
