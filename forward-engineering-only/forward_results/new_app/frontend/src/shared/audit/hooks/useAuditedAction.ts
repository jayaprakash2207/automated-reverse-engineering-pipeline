import { useCallback, useState } from 'react';
import { ApiError } from '../../api/apiError';

export interface AuditedActionResponse<T> {
  data: T;
  auditEntryId: string | null | undefined;
}

export type ActionState<T> =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'success'; data: T; auditEntryId: string }
  | { status: 'validation-failure'; message: string; fieldErrors: Record<string, string> }
  | { status: 'system-failure'; message: string; traceId?: string };

/**
 * A response body with no auditEntryId is treated as a system failure, not a success —
 * this is the UI-level enforcement of the fail-closed audit contract (Doc 20 §2, VG-04):
 * the caller must never present an action as complete without a confirmed audit record.
 */
const UNCONFIRMED_AUDIT_MESSAGE =
  'The action may have completed, but its audit record could not be confirmed. It has not been marked successful — please retry or check back before assuming it went through.';

const GENERIC_SYSTEM_FAILURE_MESSAGE = 'Something went wrong on our end. Please try again.';

export interface UseAuditedActionResult<T> {
  state: ActionState<T>;
  run: (perform: () => Promise<AuditedActionResponse<T>>) => Promise<void>;
  reset: () => void;
}

export function useAuditedAction<T>(): UseAuditedActionResult<T> {
  const [state, setState] = useState<ActionState<T>>({ status: 'idle' });

  const run = useCallback(async (perform: () => Promise<AuditedActionResponse<T>>) => {
    setState({ status: 'pending' });
    try {
      const response = await perform();

      if (!response.auditEntryId) {
        setState({ status: 'system-failure', message: UNCONFIRMED_AUDIT_MESSAGE });
        return;
      }

      setState({ status: 'success', data: response.data, auditEntryId: response.auditEntryId });
    } catch (err) {
      if (err instanceof ApiError && err.isValidationError && err.fieldErrors) {
        setState({ status: 'validation-failure', message: err.message, fieldErrors: err.fieldErrors });
        return;
      }

      const traceId = err instanceof ApiError ? err.traceId : undefined;
      setState({ status: 'system-failure', message: GENERIC_SYSTEM_FAILURE_MESSAGE, traceId });
    }
  }, []);

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { state, run, reset };
}
