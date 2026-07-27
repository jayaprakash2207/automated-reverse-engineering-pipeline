import { useAuditedAction } from '../../../shared/hooks/useAuditedAction';
import { submitLifecycleAction } from '../api/employeeLifecycleApi';

export function useEmployeeLifecycleAction() {
  return useAuditedAction(submitLifecycleAction);
}
