import { useCallback, useState } from 'react';
import { leaveRequestApi } from '../api/leaveRequestApi';
import { runAsAction } from '../../../shared/api/runAsAction';
import type { ActionResult } from '../../../shared/types/actionResult';

export function useLeaveRequestActions() {
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());

  const withBusy = useCallback(async <T>(id: number, fn: () => Promise<T>): Promise<ActionResult<T>> => {
    setBusyIds(prev => new Set(prev).add(id));
    const result = await runAsAction(fn);
    setBusyIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    return result;
  }, []);

  const approve = useCallback((id: number) => withBusy(id, () => leaveRequestApi.approve(id)), [withBusy]);
  const reject = useCallback(
    (id: number, reason: string) => withBusy(id, () => leaveRequestApi.reject(id, reason)),
    [withBusy]
  );
  const cancel = useCallback((id: number) => withBusy(id, () => leaveRequestApi.cancel(id)), [withBusy]);

  const isBusy = useCallback((id: number) => busyIds.has(id), [busyIds]);

  return { approve, reject, cancel, isBusy };
}
