import { renderHook, act } from '@testing-library/react';
import { useAuditedAction } from './useAuditedAction';
import { ApiError } from '../../api/apiError';

describe('useAuditedAction', () => {
  it('sets success state when the action returns data and an audit entry id', async () => {
    const { result } = renderHook(() => useAuditedAction<{ id: string }>());

    await act(async () => {
      await result.current.run(async () => ({ data: { id: '42' }, auditEntryId: 'audit-1' }));
    });

    expect(result.current.state).toEqual({ status: 'success', data: { id: '42' }, auditEntryId: 'audit-1' });
  });

  it('fails closed when the action succeeds but no audit entry id comes back', async () => {
    const { result } = renderHook(() => useAuditedAction<{ id: string }>());

    await act(async () => {
      await result.current.run(async () => ({ data: { id: '42' }, auditEntryId: undefined }));
    });

    expect(result.current.state.status).toBe('system-failure');
  });

  it('maps a validation ApiError to validation-failure with field errors', async () => {
    const { result } = renderHook(() => useAuditedAction<{ id: string }>());
    const error = new ApiError(
      { timestamp: '', status: 400, errorCode: 'VALIDATION_ERROR', message: 'Invalid request', path: '/x', traceId: 't-1' },
      { reason: 'must not be blank' },
    );

    await act(async () => {
      await result.current.run(async () => {
        throw error;
      });
    });

    expect(result.current.state).toEqual({
      status: 'validation-failure',
      message: 'Invalid request',
      fieldErrors: { reason: 'must not be blank' },
    });
  });

  it('maps an unexpected ApiError to a generic system-failure with a trace id', async () => {
    const { result } = renderHook(() => useAuditedAction<{ id: string }>());
    const error = new ApiError({
      timestamp: '',
      status: 500,
      errorCode: 'INTERNAL_ERROR',
      message: 'Boom',
      path: '/x',
      traceId: 'trace-99',
    });

    await act(async () => {
      await result.current.run(async () => {
        throw error;
      });
    });

    expect(result.current.state).toEqual({
      status: 'system-failure',
      message: 'Something went wrong on our end. Please try again.',
      traceId: 'trace-99',
    });
  });

  it('resets to idle', async () => {
    const { result } = renderHook(() => useAuditedAction<{ id: string }>());
    await act(async () => {
      await result.current.run(async () => ({ data: { id: '1' }, auditEntryId: 'a-1' }));
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.state).toEqual({ status: 'idle' });
  });
});
