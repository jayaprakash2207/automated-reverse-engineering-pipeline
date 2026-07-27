import { leaveRequestApi } from './leaveRequestApi';
import { httpClient } from '../../../shared/api/httpClient';
import type { LeaveRequestDto } from '../types/leaveRequest';

jest.mock('../../../shared/api/httpClient', () => ({
  httpClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedHttpClient = httpClient as jest.Mocked<typeof httpClient>;

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
    managerId: '900',
    createdAt: '2026-07-24T00:00:00Z',
    ...overrides,
  };
}

describe('leaveRequestApi', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('submit posts to /leave-requests and unwraps the leaveRequest payload', async () => {
    const dto = sampleDto();
    mockedHttpClient.post.mockResolvedValueOnce({ leaveRequest: dto });

    const result = await leaveRequestApi.submit({
      leaveType: 'ANNUAL',
      startDate: '2026-08-10',
      endDate: '2026-08-12',
      reason: 'Family trip',
    });

    expect(mockedHttpClient.post).toHaveBeenCalledWith('/leave-requests', {
      leaveType: 'ANNUAL',
      startDate: '2026-08-10',
      endDate: '2026-08-12',
      reason: 'Family trip',
    });
    expect(result).toEqual(dto);
  });

  it('listMine gets /leave-requests/mine and returns the array as-is', async () => {
    const dtos = [sampleDto()];
    mockedHttpClient.get.mockResolvedValueOnce(dtos);

    const result = await leaveRequestApi.listMine();

    expect(mockedHttpClient.get).toHaveBeenCalledWith('/leave-requests/mine');
    expect(result).toEqual(dtos);
  });

  it('listPendingApprovals gets /leave-requests/pending-approvals', async () => {
    const dtos = [sampleDto({ status: 'PENDING' })];
    mockedHttpClient.get.mockResolvedValueOnce(dtos);

    const result = await leaveRequestApi.listPendingApprovals();

    expect(mockedHttpClient.get).toHaveBeenCalledWith('/leave-requests/pending-approvals');
    expect(result).toEqual(dtos);
  });

  it('approve posts to /leave-requests/{id}/approve with an optional comment', async () => {
    const dto = sampleDto({ status: 'APPROVED' });
    mockedHttpClient.post.mockResolvedValueOnce({ leaveRequest: dto });

    const result = await leaveRequestApi.approve('lr-1', 'Enjoy your trip');

    expect(mockedHttpClient.post).toHaveBeenCalledWith('/leave-requests/lr-1/approve', {
      comment: 'Enjoy your trip',
    });
    expect(result).toEqual(dto);
  });

  it('approve omits comment when not provided', async () => {
    const dto = sampleDto({ status: 'APPROVED' });
    mockedHttpClient.post.mockResolvedValueOnce({ leaveRequest: dto });

    await leaveRequestApi.approve('lr-1');

    expect(mockedHttpClient.post).toHaveBeenCalledWith('/leave-requests/lr-1/approve', {
      comment: undefined,
    });
  });

  it('reject posts the rejection reason to /leave-requests/{id}/reject', async () => {
    const dto = sampleDto({ status: 'REJECTED', decisionReason: 'Coverage conflict' });
    mockedHttpClient.post.mockResolvedValueOnce({ leaveRequest: dto });

    const result = await leaveRequestApi.reject('lr-1', { reason: 'Coverage conflict' });

    expect(mockedHttpClient.post).toHaveBeenCalledWith('/leave-requests/lr-1/reject', {
      reason: 'Coverage conflict',
    });
    expect(result).toEqual(dto);
  });

  it('cancel posts to /leave-requests/{id}/cancel with no body', async () => {
    const dto = sampleDto({ status: 'CANCELLED' });
    mockedHttpClient.post.mockResolvedValueOnce({ leaveRequest: dto });

    const result = await leaveRequestApi.cancel('lr-1');

    expect(mockedHttpClient.post).toHaveBeenCalledWith('/leave-requests/lr-1/cancel');
    expect(result).toEqual(dto);
  });
});
