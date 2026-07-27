import { renderHook, waitFor } from '@testing-library/react';
import { usePayrollRuns } from './usePayrollRuns';
import { payrollRunApi } from '../api/payrollRunApi';
import { ApiError } from '../../../shared/api/types';

jest.mock('../api/payrollRunApi');

const mockedList = payrollRunApi.list as jest.Mock;

describe('usePayrollRuns', () => {
  beforeEach(() => {
    mockedList.mockReset();
  });

  it('starts in a loading state', () => {
    mockedList.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => usePayrollRuns());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.payrollRuns).toEqual([]);
  });

  it('populates payroll runs once the request resolves', async () => {
    mockedList.mockResolvedValue([
      { id: '1', payPeriodId: '10', status: 'COMPLETED', initiatedAt: '2026-06-21T00:00:00Z' },
    ]);
    const { result } = renderHook(() => usePayrollRuns());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.payrollRuns).toHaveLength(1);
  });

  it('surfaces an ApiError when the request fails', async () => {
    const error = new ApiError('An unexpected error occurred.', 500, 'INTERNAL_ERROR', 'trace-1');
    mockedList.mockRejectedValue(error);
    const { result } = renderHook(() => usePayrollRuns());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe(error);
    expect(result.current.payrollRuns).toEqual([]);
  });
});
