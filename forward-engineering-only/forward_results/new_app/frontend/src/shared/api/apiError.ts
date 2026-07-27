export interface ApiErrorBody {
  timestamp: string;
  status: number;
  errorCode: string;
  message: string;
  path: string;
  traceId: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Mirrors the structured JSON error body produced by the global
 * @RestControllerAdvice handler (Stack Mapping Contract row 10).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly errorCode: string;
  readonly traceId?: string;
  readonly fieldErrors?: Record<string, string>;

  constructor(body: ApiErrorBody, fieldErrors?: Record<string, string>) {
    super(body.message);
    this.name = 'ApiError';
    this.status = body.status;
    this.errorCode = body.errorCode;
    this.traceId = body.traceId;
    this.fieldErrors = fieldErrors ?? body.fieldErrors;
  }

  get isValidationError(): boolean {
    return (this.status === 400 || this.status === 422) && !!this.fieldErrors;
  }
}
