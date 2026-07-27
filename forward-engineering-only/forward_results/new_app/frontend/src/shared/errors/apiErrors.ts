export class ValidationError extends Error {
  fieldErrors: Record<string, string>;

  constructor(message: string, fieldErrors: Record<string, string>) {
    super(message);
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
  }
}

export class SystemError extends Error {
  traceId?: string;

  constructor(message: string, traceId?: string) {
    super(message);
    this.name = 'SystemError';
    this.traceId = traceId;
  }
}
