export type LifecycleActionType = 'TRANSFER' | 'PROMOTE' | 'TERMINATE' | 'REHIRE';

export interface LifecycleActionRequest {
  employeeId: string;
  actionType: LifecycleActionType;
  effectiveDate: string;
  newDepartmentId?: string;
  newJobTitleId?: string;
  reason?: string;
}
