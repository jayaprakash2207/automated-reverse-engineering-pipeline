import { useState } from 'react';
import { payrollRunApi } from '../api/payrollRunApi';
import { CreatePayrollRunRequest, PayrollRun } from '../types/payrollRun';
import { ApiError } from '../../../shared/api/types';
import { ActionStatus } from '../../../shared/components/ActionStatusBanner';

interface UseCreatePayrollRunResult {
  status: ActionStatus;
  isSubmitting: boolean;
  createRun: (request: CreatePayrollRunRequest) => Promise<PayrollRun | null>;
  reset: () => void;
}

export function useCreatePayrollRun(): UseCreatePayrollRunResult {
  const [status, setStatus] = useState<ActionStatus>({ kind: 'idle' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createRun = async (request: CreatePayrollRunRequest): Promise<PayrollRun | null> => {
    setIsSubmitting(true);
    setStatus({ kind: 'idle' });

    try {
      const run = await payrollRunApi.create(request);
      setStatus({ kind: 'success', message: `Payroll run #${run.id} created and queued for processing.` });
      return run;
    } catch (err) {
      if (err instanceof ApiError && err.kind === 'validation') {
        setStatus({ kind: 'validation', message: err.message, fieldErrors: err.fieldErrors });
      } else if (err instanceof ApiError) {
        setStatus({
          kind: 'system',
          message: 'Something went wrong creating the payroll run. Please try again.',
          traceId: err.traceId,
        });
      } else {
        setStatus({ kind: 'system', message: 'Something went wrong creating the payroll run. Please try again.' });
      }
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { status, isSubmitting, createRun, reset: () => setStatus({ kind: 'idle' }) };
}
