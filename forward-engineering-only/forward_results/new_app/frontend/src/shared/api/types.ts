export interface ApiErrorBody {
  timestamp: string;
  status: number;
  errorCode: string;
  message: string;
  path: string;
  traceId: string;
}

export type ApiErrorKind = 'validation' | 'notFound' | 'system';

export class ApiError extends Error {
  status: number;
  errorCode?: string;
  traceId?: string;
  fieldErrors?: Record<string, string>;

  constructor(
    message: string,
    status: number,
    errorCode?: string,
    traceId?: string,
    fieldErrors?: Record<string, string>
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = errorCode;
    this.traceId = traceId;
    this.fieldErrors = fieldErrors;
  }

  get kind(): ApiErrorKind {
    if (this.status === 404) return 'notFound';
    if (this.status === 400 || this.status === 422) return 'validation';
    return 'system';
  }
}
