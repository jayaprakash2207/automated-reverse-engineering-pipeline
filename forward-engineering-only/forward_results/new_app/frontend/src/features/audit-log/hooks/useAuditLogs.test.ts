import { renderHook, waitFor } from '@testing-library/react';
import { useAuditLogs } from './useAuditLogs';
import { fetchAuditLogEntries } from '../api/auditLogApi';

jest.mock('../api/auditLogApi');

const mockFetch = fetchAuditLogEntries as jest.Mock;

describe('useAuditLogs', () => {
  it('loads audit log entries for the given filters', async () => {
    mockFetch.mockResolvedValue({ content: [], page: 0, size: 25, totalElements: 0, totalPages: 0 });

    const { result } = renderHook(() => useAuditLogs({ page: 0, size: 25 }));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual({ content: [], page: 0, size: 25, totalElements: 0, totalPages: 0 });
    expect(result.current.error).toBeNull();
  });

  it('surfaces a retry-able error message instead of failing silently', async () => {
    mockFetch.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useAuditLogs({ page: 0, size: 25 }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Unable to load audit log entries. Please retry.');
  });
});
