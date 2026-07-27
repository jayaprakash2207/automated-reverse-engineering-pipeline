import { useCallback, useState } from 'react';
import { applyLifecycleAction } from '../api/employeeApi';
import { ApiError } from '../../../shared/api/apiError';
import type { ActionState } from '../../../shared/api/actionState';
import type { LifecycleActionInput, LifecycleActionResult } from '../types/employee';

// Implements Doc 20 §3's three-outcome contract for transfer / promote /
// terminate / rehire: this hook never lets a caught error propagate as a raw
// throw into the component tree — it always resolves into one of the
// ActionState variants the UI knows how to render.
export function useEmployeeLifecycleAction(employeeId: number) {
  const [state, setState] = useState<ActionState<LifecycleActionResult>>({ status: 'idle' });

  const execute = useCallback(
    async (input: LifecycleActionInput) => {
      setState({ status: 'submitting' });
      try {
        const result = await applyLifecycleAction(employeeId, input);
        setState({ status: 'success', data: result });
      } catch (err) {
        if (err instanceof ApiError && err.kind === 'VALIDATION') {
          setState({ status: 'validation_error', message: err.message, fieldErrors: err.fieldErrors });
        } else if (err instanceof ApiError && err.kind === 'CONFLICT') {
          setState({
            status: 'validation_error',
            message: err.message || 'This employee record changed since you loaded it. Refresh and try again.',
            fieldErrors: [],
          });
        } else if (err instanceof ApiError) {
          setState({ status: 'system_error', message: 'Something went wrong. Please try again.', traceId: err.traceId });
        } else {
          setState({ status: 'system_error', message: 'Something went wrong. Please try again.', traceId: '' });
        }
      }
    },
    [employeeId],
  );

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { state, execute, reset };
}
