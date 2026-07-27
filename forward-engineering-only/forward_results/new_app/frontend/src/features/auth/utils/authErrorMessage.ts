import { ApiError } from '../../../shared/api/apiError';

// Maps the backend's GlobalExceptionHandler error envelope (Stack Mapping
// Contract row 10) to the user-facing copy required by UI/UX Spec Doc 20 §4:
// a distinct message for bad credentials vs. account lockout vs. an
// unexpected system failure — never a raw error code, and lockout state is
// never conflated with plain invalid-credentials state.
export function resolveLoginErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Something went wrong. Please try again.';
  }

  if (error.status === 0) {
    return error.message;
  }

  if (error.errorCode === 'ACCOUNT_LOCKED' || error.status === 423) {
    return 'Your account has been locked after repeated failed sign-in attempts. Try again later or contact your administrator.';
  }

  if (error.status === 401) {
    return 'Invalid email or password.';
  }

  return error.traceId
    ? `Something went wrong on our end. Please try again (reference: ${error.traceId}).`
    : 'Something went wrong on our end. Please try again.';
}
