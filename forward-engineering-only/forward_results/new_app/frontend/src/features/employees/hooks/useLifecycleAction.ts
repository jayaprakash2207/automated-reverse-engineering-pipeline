import { useAsyncOutcome } from '../../../shared/hooks/useAsyncOutcome';
import { UpdateEmployeeResponse } from '../types/employee';

export function useLifecycleAction<P>(actionFn: (payload: P) => Promise<UpdateEmployeeResponse>) {
  return useAsyncOutcome<P, UpdateEmployeeResponse>(actionFn);
}
