import { renderHook, act } from '@testing-library/react';
import { useCreatePayrollRun } from './useCreatePayrollRun';
import { payrollRunApi } from '../api/payrollRunApi';
import { ApiError } from '../../../shared/api/types';

jest.mock('../api/payrollRunApi');

const mockedCreate = payrollRunApi.create as jest.Mock;

describe('useCreatePayrollRun', () => {
  beforeEach(() => {
    mockedCreate.mockReset();
  });

  it('starts idle with no error and not submitting', () => {
    const { result } = renderHook(() => useCreatePayrollRun());
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('flips isSubmitting for the duration of the request', async () => {
    let resolveCreate: (value: unknown) => void = () => {};
    mockedCreate.mockReturnValue(new Promise((resolve) => { resolveCreate = resolve; }));
    const { result } = renderHook(() => useCreatePayrollRun());

    act(() => {
      result.current.createPayrollRun('10');
    });
    expect(result.current.isSubmitting).toBe(true);

    await act(async () => {
      resolveCreate({ id: '1', payPeriodId: '10', status: 'PENDING' });
    });
    expect(result.current.isSubmitting).toBe(false);
  });

  it('returns the created run on success', async () => {
    mockedCreate.mockResolvedValue({ id: '1', payPeriodId: '10', status: 'PENDING' });
    const { result } = renderHook(() => useCreatePayrollRun());

    let created;
    await act(async () => {
      created = await result.current.createPayrollRun('10');
    });
    expect(created).toEqual({ id: '1', payPeriodId: '10', status: 'PENDING' });
    expect(result.current.error).toBeNull();
  });

  it('captures a conflict ApiError from a duplicate active run', async () => {
    const error = new ApiError(
      'A payroll run is already in progress for this pay period.',
      409,
      'PAYROLL_RUN_ALREADY_ACTIVE',
      'trace-409'
    );
    mockedCreate.mockRejectedValue(error);
    const { result } = renderHook(() => useCreatePayrollRun());

    await act(async () => {
      await expect(result.current.createPayrollRun('10')).rejects.toThrow();
    });
    expect(result.current.error).toBe(error);
    expect(result.current.isSubmitting).toBe(false);
  });
});
