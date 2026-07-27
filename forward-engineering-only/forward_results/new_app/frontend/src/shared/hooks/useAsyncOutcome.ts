import { useCallback, useState } from 'react';
import { ApiError } from '../types/apiError';

/**
 * Implements the three-state UX contract from UI/UX Spec (Document 20) §3
 * for every mutating employee-lifecycle action: success, validation failure
 * (field-level message), or system failure (generic message + trace id).
 * There is no fourth "unknown" state — a screen using this hook never shows
 * a raw error code or a blank/frozen view.
 */
export type AsyncOutcome<R> =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; result: R }
  | { kind: 'validation_failure'; error: ApiError }
  | { kind: 'system_failure'; error: ApiError };

export function useAsyncOutcome<P, R>(actionFn: (payload: P) => Promise<R>) {
  const [outcome, setOutcome] = useState<AsyncOutcome<R>>({ kind: 'idle' });

  const run = useCallback(
    async (payload: P) => {
      setOutcome({ kind: 'submitting' });
      try {
        const result = await actionFn(payload);
        setOutcome({ kind: 'success', result });
      } catch (err) {
        if (err instanceof ApiError && err.isValidationError) {
          setOutcome({ kind: 'validation_failure', error: err });
        } else if (err instanceof ApiError) {
          setOutcome({ kind: 'system_failure', error: err });
        } else {
          setOutcome({
            kind: 'system_failure',
            error: new ApiError({
              timestamp: new Date().toISOString(),
              status: 0,
              error_code: 'NETWORK_ERROR',
              message: 'Unable to reach the server.',
              path: '',
              trace_id: 'unavailable',
            }),
          });
        }
      }
    },
    [actionFn],
  );

  const reset = useCallback(() => setOutcome({ kind: 'idle' }), []);

  return { outcome, run, reset };
}
