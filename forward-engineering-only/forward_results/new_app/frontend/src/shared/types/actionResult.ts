// Client-side shape of the three-state mutating-action contract required by
// UI/UX Spec §3 (transparent failure states) and §2 (audit entry must be
// surfaced or the UI must fail closed, per Stack Mapping Contract row 10 / §2.4).
export type ActionOutcomeStatus = 'success' | 'validationFailure' | 'systemFailure';

export interface AuditedActionResponse<T> {
  data: T;
  auditEntryId: string;
}

export interface ActionSuccessResult<T> {
  status: 'success';
  data: T;
  auditEntryId: string;
}

export interface ActionValidationFailureResult {
  status: 'validationFailure';
  fieldErrors: Record<string, string>;
}

export interface ActionSystemFailureResult {
  status: 'systemFailure';
  traceId?: string;
  message?: string;
}

export type ActionOutcome<T> =
  | ActionSuccessResult<T>
  | ActionValidationFailureResult
  | ActionSystemFailureResult;
