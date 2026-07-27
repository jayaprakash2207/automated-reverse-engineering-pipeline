import { renderHook, act } from '@testing-library/react';
import { useAuditedAction } from './useAuditedAction';
import { ApiError, NetworkError } from '../api/apiClient';

describe('useAuditedAction', () => {
  it('reports success and surfaces the audit entry id when the audit write is recorded', async () => {
    const action = jest.fn().mockResolvedValue({
      result: { id: '1' },
      auditEntryId: 'audit-123',
      auditStatus: 'RECORDED',
    });
    const { result } = renderHook(() => useAuditedAction(action, () => 'Leave request approved'));

    await act(async () => {
      await result.current.execute({});
    });

    expect(result.current.outcome).toEqual({
      status: 'success',
      message: 'Leave request approved',
      auditEntryId: 'audit-123',
    });
  });

  it('fails closed when the audit write failed even though the primary action succeeded', async () => {
    const action = jest.fn().mockResolvedValue({
      result: { id: '1' },
      auditStatus: 'FAILED',
    });
    const { result } = renderHook(() => useAuditedAction(action, () => 'Leave request approved'));

    await act(async () => {
      await result.current.execute({});
    });

    expect(result.current.outcome.status).toBe('systemError');
  });

  it('fails closed when no audit entry id is returned at all', async () => {
    const action = jest.fn().mockResolvedValue({ result: { id: '1' } });
    const { result } = renderHook(() => useAuditedAction(action, () => 'Leave request approved'));

    await act(async () => {
      await result.current.execute({});
    });

    expect(result.current.outcome.status).toBe('systemError');
  });

  it('surfaces field-level validation errors from a 400 response', async () => {
    const action = jest
      .fn()
      .mockRejectedValue(new ApiError(400, 'Invalid request', { fieldErrors: { reason: 'Reason is required' } }));
    const { result } = renderHook(() => useAuditedAction(action, () => 'ok'));

    await act(async () => {
      await result.current.execute({});
    });

    expect(result.current.outcome).toEqual({
      status: 'validationError',
      fieldErrors: { reason: 'Reason is required' },
    });
  });

  it('surfaces a system error on network failure', async () => {
    const action = jest.fn().mockRejectedValue(new NetworkError(new Error('offline')));
    const { result } = renderHook(() => useAuditedAction(action, () => 'ok'));

    await act(async () => {
      await result.current.execute({});
    });

    expect(result.current.outcome.status).toBe('systemError');
  });
});
