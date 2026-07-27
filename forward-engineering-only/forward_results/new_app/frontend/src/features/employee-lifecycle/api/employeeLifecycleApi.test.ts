import { apiRequest } from '../../../shared/api/httpClient';
import { submitLifecycleAction } from './employeeLifecycleApi';

jest.mock('../../../shared/api/httpClient');

const mockApiRequest = apiRequest as jest.Mock;

describe('employeeLifecycleApi.submitLifecycleAction', () => {
  beforeEach(() => {
    mockApiRequest.mockResolvedValue({ status: 'SUCCESS', auditEntryId: 'audit-1' });
  });

  it('posts to /employees/{employeeId}/lifecycle-actions with the full request as the body', async () => {
    await submitLifecycleAction({
      employeeId: 'emp-1',
      actionType: 'TRANSFER',
      effectiveDate: '2026-08-01',
      newDepartmentId: 'dept-2',
      reason: 'Reorg',
    });

    const [path, options] = mockApiRequest.mock.calls[0];
    expect(path).toBe('/employees/emp-1/lifecycle-actions');
    expect(options.method).toBe('POST');
    expect(options.body).toEqual({
      employeeId: 'emp-1',
      actionType: 'TRANSFER',
      effectiveDate: '2026-08-01',
      newDepartmentId: 'dept-2',
      reason: 'Reorg',
    });
  });

  it('supports all four lifecycle action types called out in UC-02 (transfer/promote/terminate/rehire)', async () => {
    for (const actionType of ['TRANSFER', 'PROMOTE', 'TERMINATE', 'REHIRE'] as const) {
      await submitLifecycleAction({ employeeId: 'emp-1', actionType, effectiveDate: '2026-08-01' });
      const last = mockApiRequest.mock.calls[mockApiRequest.mock.calls.length - 1];
      expect(last[1].body.actionType).toBe(actionType);
    }
  });

  it('scopes the path to the specific employeeId being changed', async () => {
    await submitLifecycleAction({ employeeId: 'emp-42', actionType: 'PROMOTE', effectiveDate: '2026-08-01' });
    expect(mockApiRequest.mock.calls[0][0]).toBe('/employees/emp-42/lifecycle-actions');
  });
});
