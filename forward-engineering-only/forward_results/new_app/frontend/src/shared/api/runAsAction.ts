import { ApiError } from './apiError';
import type { ActionResult } from '../types/actionResult';

export async function runAsAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { kind: 'success', data };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.isValidationError) {
        return { kind: 'validation_error', message: err.message, fieldErrors: err.fieldErrors };
      }
      return { kind: 'system_error', message: err.message, traceId: err.traceId };
    }
    return { kind: 'system_error', message: 'An unexpected error occurred. Please try again.' };
  }
}
