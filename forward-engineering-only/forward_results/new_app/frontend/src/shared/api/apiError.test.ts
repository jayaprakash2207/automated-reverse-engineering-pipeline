import { ApiError } from './apiError';

// NOTE: this is a SECOND, differently-shaped ApiError class living at
// shared/api/apiError.ts, distinct from shared/types/apiError.ts (see that
// file's own test) — this one takes positional constructor args
// (status, message, errorCode?, traceId?) instead of a structured error body
// and has no isValidationError/isConflict helpers. shared/api/httpClient.ts
// imports the shared/types version (`../types/apiError`), so this one has no
// known caller in the delivered file set. Flagging the duplication rather
// than deleting either file, since choosing one is a source decision for the
// frontend agent, not this test-writer pass.
describe('ApiError (shared/api/apiError.ts — orphaned duplicate)', () => {
  it('sets status, message and name from constructor args', () => {
    const error = new ApiError(404, 'Employee not found');
    expect(error.status).toBe(404);
    expect(error.message).toBe('Employee not found');
    expect(error.name).toBe('ApiError');
    expect(error.errorCode).toBeUndefined();
    expect(error.traceId).toBeUndefined();
  });

  it('carries an optional errorCode and traceId', () => {
    const error = new ApiError(500, 'Boom', 'INTERNAL', 'trace-1');
    expect(error.errorCode).toBe('INTERNAL');
    expect(error.traceId).toBe('trace-1');
  });

  it('is a real Error instance usable with instanceof checks', () => {
    const error = new ApiError(400, 'Bad request');
    expect(error).toBeInstanceOf(Error);
  });
});
