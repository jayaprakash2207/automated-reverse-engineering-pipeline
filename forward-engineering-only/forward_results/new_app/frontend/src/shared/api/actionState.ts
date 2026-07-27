import type { ApiErrorFieldEntry } from './apiError';

// Encodes the UI/UX spec's "exactly three visible states" contract for
// mutating employee-lifecycle actions (Doc 20 §3: success / validation
// failure / system failure — never a raw error or a blank/frozen screen).
// `idle` and `submitting` are pre-visible-outcome states needed to drive a
// form's disabled/pending UI.
export type ActionState<T> =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; data: T }
  | { status: 'validation_error'; message: string; fieldErrors: ApiErrorFieldEntry[] }
  | { status: 'system_error'; message: string; traceId: string };

export const idleActionState: ActionState<never> = { status: 'idle' };
