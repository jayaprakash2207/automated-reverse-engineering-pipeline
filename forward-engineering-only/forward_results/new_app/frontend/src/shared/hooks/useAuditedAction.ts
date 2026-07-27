import { useCallback, useState } from 'react';
import { ApiError, NetworkError } from '../api/apiClient';
import type { ActionOutcome } from '../components/ActionResultBanner';

export interface AuditedActionResponse<T> {
  result: T;
  auditEntryId?: string;
  auditStatus?: 'RECORDED' | 'FAILED';
}

// Fail-closed by construction (NFR-R2 / Stack Mapping Contract row 10 + §2 item 4):
// even a 2xx response is only ever surfaced as 'success' if the audit write was
// actually recorded. A missing/failed audit status renders as systemError, so a
// mutating action (e.g. leave approval) can never appear to have gone through
// while its audit trail silently didn't.
export function useAuditedAction<TInput, TResult>(
  action: (input: TInput) => Promise<AuditedActionResponse<TResult>>,
  buildSuccessMessage: (result: TResult) => string
) {
  const [outcome, setOutcome] = useState<ActionOutcome>({ status: 'idle' });

  const execute = useCallback(
    async (input: TInput) => {
      setOutcome({ status: 'pending' });
      try {
        const response = await action(input);

        if (response.auditStatus === 'FAILED' || !response.auditEntryId) {
          setOutcome({
            status: 'systemError',
            message:
              'The action could not be confirmed because the audit record failed to save. Nothing was changed — please try again.',
          });
          return;
        }

        setOutcome({
          status: 'success',
          message: buildSuccessMessage(response.result),
          auditEntryId: response.auditEntryId,
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 400 && error.fieldErrors) {
          setOutcome({ status: 'validationError', fieldErrors: error.fieldErrors });
          return;
        }
        if (error instanceof ApiError) {
          setOutcome({ status: 'systemError', message: error.message, traceId: error.traceId });
          return;
        }
        if (error instanceof NetworkError) {
          setOutcome({ status: 'systemError', message: error.message });
          return;
        }
        setOutcome({ status: 'systemError', message: 'An unexpected error occurred. Please try again.' });
      }
    },
    [action, buildSuccessMessage]
  );

  return { outcome, execute };
}
