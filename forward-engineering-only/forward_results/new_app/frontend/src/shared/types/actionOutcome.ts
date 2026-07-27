export type ActionOutcome<TResult> =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'success'; auditEntryId: string; data: TResult }
  | { status: 'validationError'; fieldErrors: Record<string, string> }
  | { status: 'systemError'; message: string; traceId?: string };
