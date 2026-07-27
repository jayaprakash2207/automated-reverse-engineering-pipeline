// Mirrors the structured JSON error body produced by the backend's global
// @RestControllerAdvice (Stack Mapping Contract row 10).
export interface ApiError {
  timestamp: string;
  status: number;
  errorCode: string;
  message: string;
  path: string;
  traceId: string;
}

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "errorCode" in value &&
    "traceId" in value
  );
}
