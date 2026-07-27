import { useCallback, useEffect, useState } from 'react';
import { leaveRequestApi } from '../api/leaveRequestApi';
import { runAsAction } from '../../../shared/api/runAsAction';
import type {
  CreateLeaveRequestRequest,
  LeaveRequestCancelResponse,
  LeaveRequestDto,
  LeaveRequestSubmittedResponse,
} from '../types/leaveRequest';
import type { ActionResult } from '../../../shared/types/actionResult';

export function useMyLeaveRequests() {
  const [items, setItems] = useState<LeaveRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await leaveRequestApi.fetchMine();
      setItems(data);
      setError(null);
    } catch {
      setError('Unable to load your leave requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const submit = useCallback(
    async (req: CreateLeaveRequestRequest): Promise<ActionResult<LeaveRequestSubmittedResponse>> => {
      setSubmitting(true);
      const result = await runAsAction(() => leaveRequestApi.create(req));
      setSubmitting(false);
      if (result.kind === 'success') {
        await refetch();
      }
      return result;
    },
    [refetch]
  );

  const cancel = useCallback(
    async (id: number): Promise<ActionResult<LeaveRequestCancelResponse>> => {
      const result = await runAsAction(() => leaveRequestApi.cancel(id));
      if (result.kind === 'success') {
        await refetch();
      }
      return result;
    },
    [refetch]
  );

  return { items, loading, error, submitting, refetch, submit, cancel };
}
