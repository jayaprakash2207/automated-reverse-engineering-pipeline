import { renderHook, act } from '@testing-library/react';
import { useEmployeeLifecycleAction } from './useEmployeeLifecycleAction';
import * as employeeLifecycleApi from '../api/employeeLifecycleApi';

jest.mock('../api/employeeLifecycleApi');

describe('useEmployeeLifecycleAction', () => {
  it('starts idle', () => {
    const { result } = renderHook(() => useEmployeeLifecycleAction());
    expect(result.current.state).toEqual({ phase: 'idle' });
  });

  it('wires run() to submitLifecycleAction and surfaces its audit entry id on success', async () => {
    jest.spyOn(employeeLifecycleApi, 'submitLifecycleAction').mockResolvedValue({
      status: 'SUCCESS',
      auditEntryId: 'audit-7',
    });

    const { result } = renderHook(() => useEmployeeLifecycleAction());

    await act(async () => {
      await result.current.run({ employeeId: 'emp-1', actionType: 'TERMINATE', effectiveDate: '2026-09-01' });
    });

    expect(employeeLifecycleApi.submitLifecycleAction).toHaveBeenCalledWith({
      employeeId: 'emp-1',
      actionType: 'TERMINATE',
      effectiveDate: '2026-09-01',
    });
    expect(result.current.state).toEqual({
      phase: 'done',
      outcome: { status: 'success', auditEntryId: 'audit-7', message: undefined },
    });
  });
});
