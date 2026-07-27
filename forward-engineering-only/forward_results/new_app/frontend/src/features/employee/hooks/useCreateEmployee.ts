import { useCallback, useState } from 'react';
import { createEmployee } from '../api/employeeApi';
import { ApiError } from '../../../shared/api/apiError';
import type { ActionState } from '../../../shared/api/actionState';
import type { CreateEmployeeInput, Employee } from '../types/employee';

export function useCreateEmployee() {
  const [state, setState] = useState<ActionState<Employee>>({ status: 'idle' });

  const execute = useCallback(async (input: CreateEmployeeInput) => {
    setState({ status: 'submitting' });
    try {
      const employee = await createEmployee(input);
      setState({ status: 'success', data: employee });
    } catch (err) {
      if (err instanceof ApiError && err.kind === 'VALIDATION') {
        setState({ status: 'validation_error', message: err.message, fieldErrors: err.fieldErrors });
      } else if (err instanceof ApiError && err.kind === 'CONFLICT') {
        setState({
          status: 'validation_error',
          message: err.message || 'An employee with this email already exists.',
          fieldErrors: [],
        });
      } else if (err instanceof ApiError) {
        setState({ status: 'system_error', message: 'Something went wrong. Please try again.', traceId: err.traceId });
      } else {
        setState({ status: 'system_error', message: 'Something went wrong. Please try again.', traceId: '' });
      }
    }
  }, []);

  return { state, execute };
}
