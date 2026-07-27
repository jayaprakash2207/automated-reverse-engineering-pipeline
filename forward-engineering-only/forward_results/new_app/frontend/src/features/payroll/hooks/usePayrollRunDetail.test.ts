import { renderHook, waitFor } from '@testing-library/react';
import { usePayrollRunDetail } from './usePayrollRunDetail';
import { payrollRunApi } from '../api/payrollRunApi';
import { ApiError } from '../../../shared/api/types';

jest.mock('../api/payrollRunApi');

const mockedGetById = payrollRunApi.getById as jest.Mock;

describe('usePayrollRunDetail', () => {
  beforeEach(() => {
    mockedGetById.mockReset();
  });

  it('fetches the run matching the given id', async () => {
    mockedGetById.mockResolvedValue({ id: '42', payPeriodId: '10', status: 'PENDING' });
    const { result } = renderHook(() => usePayrollRunDetail('42'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockedGetById).toHaveBeenCalledWith('42');
    expect(result.current.payrollRun?.id).toBe('42');
  });

  it('surfaces a not-found ApiError', async () => {
    const error = new ApiError('Payroll run not found.', 404, 'PAYROLL_RUN_NOT_FOUND', 'trace-404');
    mockedGetById.mockRejectedValue(error);
    const { result } = renderHook(() => usePayrollRunDetail('999'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe(error);
    expect(result.current.payrollRun).toBeNull();
  });

  it('re-fetches when the runId changes', async () => {
    mockedGetById.mockResolvedValue({ id: '1' });
    const { rerender } = renderHook(({ runId }) => usePayrollRunDetail(runId), {
      initialProps: { runId: '1' },
    });
    await waitFor(() => expect(mockedGetById).toHaveBeenCalledTimes(1));

    rerender({ runId: '2' });
    await waitFor(() => expect(mockedGetById).toHaveBeenCalledTimes(2));
    expect(mockedGetById).toHaveBeenLastCalledWith('2');
  });
});
