import { renderHook } from '@testing-library/react';
import { useLeaveRequestActions } from './useLeaveRequestActions';
import { leaveRequestApi } from '../api/leaveRequestApi';
import { ApiError } from '../../../shared/api/apiError';
import type { LeaveRequestDto } from '../types/leaveRequest';

jest.mock('../api/leaveRequestApi', () => ({
  leaveRequestApi: {
    submit: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    cancel: jest.fn(),
  },
}));

const mockedApi = leaveRequestApi as jest.Mocked<typeof leaveRequestApi>;

function dto(overrides: Partial<LeaveRequestDto> = {}): LeaveRequestDto {
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

describe('useLeaveRequestActions', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('submit() wraps a successful api call in a success ActionResult', async () => {
    mockedApi.submit.mockResolvedValueOnce(dto());
    const { result } = renderHook(() => useLeaveRequestActions());

    const outcome = await result.current.submit({
      leaveType: 'ANNUAL',
      startDate: '2026-08-10',
      endDate: '2026-08-12',
      reason: 'Family trip',
    });

    expect(outcome).toEqual({ kind: 'success', data: dto() });
  });

  it('submit() maps a 400 API error to a validation_error ActionResult with fieldErrors', async () => {
    mockedApi.submit.mockRejectedValueOnce(
      new ApiError({
        status: 400,
        errorCode: 'VALIDATION_ERROR',
        message: 'startDate must not be after endDate',
        timestamp: '2026-07-24T00:00:00Z',
        path: '/leave-requests',
        fieldErrors: { endDate: 'must be on or after startDate' },
      })
    );
    const { result } = renderHook(() => useLeaveRequestActions());

    const outcome = await result.current.submit({
      leaveType: 'ANNUAL',
      startDate: '2026-08-12',
      endDate: '2026-08-10',
      reason: 'Bad range',
    });

    expect(outcome).toEqual({
      kind: 'validation_error',
      message: 'startDate must not be after endDate',
      fieldErrors: { endDate: 'must be on or after startDate' },
    });
  });

  it('approve() calls the api with id and optional comment', async () => {
    mockedApi.approve.mockResolvedValueOnce(dto({ status: 'APPROVED' }));
    const { result } = renderHook(() => useLeaveRequestActions());

    const outcome = await result.current.approve('lr-1', 'Enjoy!');

    expect(mockedApi.approve).toHaveBeenCalledWith('lr-1', 'Enjoy!');
    expect(outcome.kind).toBe('success');
  });

  it('approve() maps a 403 (not the assigned manager / self-approval) to a system_error ActionResult', async () => {
    mockedApi.approve.mockRejectedValueOnce(
      new ApiError({
        status: 403,
        errorCode: 'FORBIDDEN',
        message: 'Not authorized to act on this leave request',
        timestamp: '2026-07-24T00:00:00Z',
        path: '/leave-requests/lr-1/approve',
      })
    );
    const { result } = renderHook(() => useLeaveRequestActions());

    const outcome = await result.current.approve('lr-1');

    expect(outcome).toEqual({
      kind: 'system_error',
      message: 'Not authorized to act on this leave request',
      traceId: undefined,
    });
  });

  it('reject() requires a reason and forwards it to the api', async () => {
    mockedApi.reject.mockResolvedValueOnce(dto({ status: 'REJECTED', decisionReason: 'Coverage conflict' }));
    const { result } = renderHook(() => useLeaveRequestActions());

    await result.current.reject('lr-1', 'Coverage conflict');

    expect(mockedApi.reject).toHaveBeenCalledWith('lr-1', { reason: 'Coverage conflict' });
  });

  it('reject() maps a 409 (already decided) conflict to a system_error ActionResult', async () => {
    mockedApi.reject.mockRejectedValueOnce(
      new ApiError({
        status: 409,
        errorCode: 'CONFLICT',
        message: 'Only pending leave requests can be rejected',
        timestamp: '2026-07-24T00:00:00Z',
        path: '/leave-requests/lr-1/reject',
      })
    );
    const { result } = renderHook(() => useLeaveRequestActions());

    const outcome = await result.current.reject('lr-1', 'Too late');

    expect(outcome.kind).toBe('system_error');
  });

  it('cancel() calls the api with only the id', async () => {
    mockedApi.cancel.mockResolvedValueOnce(dto({ status: 'CANCELLED' }));
    const { result } = renderHook(() => useLeaveRequestActions());

    await result.current.cancel('lr-1');

    expect(mockedApi.cancel).toHaveBeenCalledWith('lr-1');
  });
});
