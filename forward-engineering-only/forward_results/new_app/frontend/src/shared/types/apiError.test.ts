import { ApiError } from './apiError';

describe('ApiError (shared/types/apiError.ts)', () => {
  const baseBody = {
    timestamp: '2026-07-25T00:00:00Z',
    status: 404,
    error_code: 'EMPLOYEE_NOT_FOUND',
    message: 'Employee not found',
    path: '/api/v1/employees/999',
    trace_id: 'trace-abc',
  };

  it('maps snake_case body fields onto camelCase properties', () => {
    const error = new ApiError(baseBody);
    expect(error.status).toBe(404);
    expect(error.errorCode).toBe('EMPLOYEE_NOT_FOUND');
    expect(error.traceId).toBe('trace-abc');
    expect(error.path).toBe('/api/v1/employees/999');
    expect(error.message).toBe('Employee not found');
  });

  it('defaults fieldErrors to an empty array when the backend omits field_errors', () => {
    const error = new ApiError(baseBody);
    expect(error.fieldErrors).toEqual([]);
  });

  it('surfaces field_errors when the backend includes them', () => {
    const error = new ApiError({
      ...baseBody,
      status: 400,
      field_errors: [{ field: 'email', message: 'must not be blank' }],
    });
    expect(error.fieldErrors).toEqual([{ field: 'email', message: 'must not be blank' }]);
  });

  it.each([400, 422])('treats status %d as a validation error', (status) => {
    const error = new ApiError({ ...baseBody, status });
    expect(error.isValidationError).toBe(true);
    expect(error.isConflict).toBe(false);
  });

  it('treats status 409 as a conflict', () => {
    const error = new ApiError({ ...baseBody, status: 409 });
    expect(error.isConflict).toBe(true);
    expect(error.isValidationError).toBe(false);
  });

  it('treats other statuses (e.g. 500) as neither validation nor conflict', () => {
    const error = new ApiError({ ...baseBody, status: 500 });
    expect(error.isValidationError).toBe(false);
    expect(error.isConflict).toBe(false);
  });
});
