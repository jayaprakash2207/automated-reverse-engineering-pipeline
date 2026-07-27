import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuditLogSearch } from './useAuditLogSearch';
import * as auditLogApi from '../api/auditLogApi';

jest.mock('../api/auditLogApi');

describe('useAuditLogSearch', () => {
  it('fetches on mount with empty filters and page 0', async () => {
    const search = jest.spyOn(auditLogApi, 'searchAuditLogs').mockResolvedValue({ entries: [], totalCount: 0 });
    const { result } = renderHook(() => useAuditLogSearch());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(search).toHaveBeenCalledWith({}, 0, 25, expect.anything());
  });

  it('reflects loading state while the search is in flight', async () => {
    let resolveSearch!: (value: auditLogApi.AuditLogPage) => void;
    const pending = new Promise<auditLogApi.AuditLogPage>((resolve) => {
      resolveSearch = resolve;
    });
    jest.spyOn(auditLogApi, 'searchAuditLogs').mockReturnValue(pending);

    const { result } = renderHook(() => useAuditLogSearch());
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveSearch({ entries: [], totalCount: 0 });
      await pending;
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('populates entries and totalCount from the search result', async () => {
    jest.spyOn(auditLogApi, 'searchAuditLogs').mockResolvedValue({
      entries: [
        {
          auditEntryId: 'audit-1',
          occurredAt: '2026-01-01T00:00:00Z',
          actorName: 'Jamie',
          actorId: 'u1',
          action: 'LEAVE_APPROVED',
          entityType: 'LEAVE_REQUEST',
          entityId: 'l1',
          outcome: 'SUCCESS',
        },
      ],
      totalCount: 1,
    });

    const { result } = renderHook(() => useAuditLogSearch());

    await waitFor(() => expect(result.current.totalCount).toBe(1));
    expect(result.current.entries).toHaveLength(1);
  });

  it('applyFilters resets the page to 0 and re-fetches with the new filters', async () => {
    const search = jest.spyOn(auditLogApi, 'searchAuditLogs').mockResolvedValue({ entries: [], totalCount: 100 });
    const { result } = renderHook(() => useAuditLogSearch());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setPage(2);
    });
    await waitFor(() => expect(result.current.page).toBe(2));

    act(() => {
      result.current.applyFilters({ actorName: 'Jamie Rivera' });
    });

    await waitFor(() => expect(result.current.page).toBe(0));
    expect(result.current.filters).toEqual({ actorName: 'Jamie Rivera' });
    expect(search).toHaveBeenLastCalledWith({ actorName: 'Jamie Rivera' }, 0, 25, expect.anything());
  });

  it('changing the page re-fetches without altering the current filters', async () => {
    const search = jest.spyOn(auditLogApi, 'searchAuditLogs').mockResolvedValue({ entries: [], totalCount: 100 });
    const { result } = renderHook(() => useAuditLogSearch({ entityType: 'LEAVE_REQUEST' }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setPage(1);
    });

    await waitFor(() =>
      expect(search).toHaveBeenLastCalledWith({ entityType: 'LEAVE_REQUEST' }, 1, 25, expect.anything())
    );
  });

  it('surfaces a readable error message when the search rejects', async () => {
    jest.spyOn(auditLogApi, 'searchAuditLogs').mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useAuditLogSearch());

    await waitFor(() => expect(result.current.error).toBe('network down'));
    expect(result.current.isLoading).toBe(false);
  });

  it('aborts the in-flight request on unmount', async () => {
    const abortSpy = jest.spyOn(AbortController.prototype, 'abort');
    jest.spyOn(auditLogApi, 'searchAuditLogs').mockReturnValue(new Promise(() => {}));

    const { unmount } = renderHook(() => useAuditLogSearch());
    unmount();

    expect(abortSpy).toHaveBeenCalled();
    abortSpy.mockRestore();
  });
});
