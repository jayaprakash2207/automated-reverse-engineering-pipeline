import { renderHook, waitFor } from '@testing-library/react';
import { usePayPeriods } from './usePayPeriods';
import { payPeriodApi } from '../api/payPeriodApi';
import { ApiError } from '../../../shared/api/types';

jest.mock('../api/payPeriodApi');

const mockedList = payPeriodApi.list as jest.Mock;

describe('usePayPeriods', () => {
  beforeEach(() => {
    mockedList.mockReset();
  });

  it('starts in a loading state', () => {
    mockedList.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => usePayPeriods());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.payPeriods).toEqual([]);
  });

  it('populates pay periods once the request resolves', async () => {
    mockedList.mockResolvedValue([
      { id: '1', startDate: '2026-06-01', endDate: '2026-06-15', payDate: '2026-06-20', status: 'CLOSED' },
    ]);
    const { result } = renderHook(() => usePayPeriods());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.payPeriods).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('passes the status filter through to the api', () => {
    mockedList.mockReturnValue(new Promise(() => {}));
    renderHook(() => usePayPeriods('CLOSED'));
    expect(mockedList).toHaveBeenCalledWith('CLOSED');
  });

  it('surfaces an ApiError when the request fails', async () => {
    const error = new ApiError('Unable to reach the server. Please try again.', 0);
    mockedList.mockRejectedValue(error);
    const { result } = renderHook(() => usePayPeriods());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe(error);
    expect(result.current.payPeriods).toEqual([]);
  });

  it('re-fetches when the status filter changes', async () => {
    mockedList.mockResolvedValue([]);
    const { rerender } = renderHook(({ status }) => usePayPeriods(status), {
      initialProps: { status: undefined as string | undefined },
    });
    await waitFor(() => expect(mockedList).toHaveBeenCalledTimes(1));

    rerender({ status: 'CLOSED' });
    await waitFor(() => expect(mockedList).toHaveBeenCalledTimes(2));
    expect(mockedList).toHaveBeenLastCalledWith('CLOSED');
  });
});
