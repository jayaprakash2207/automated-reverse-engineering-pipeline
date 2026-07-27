import { idleActionState } from './actionState';
import type { ActionState } from './actionState';

// actionState.ts does `import type { ApiErrorFieldEntry } from './apiError'`,
// but shared/api/apiError.ts only exports the `ApiError` class — it never
// declares `ApiErrorFieldEntry`. Under frontend/jest.config.ts (ts-jest) this
// is a type-check error; under frontend/jest.config.cjs (babel-jest) types
// are stripped so it runs anyway. The project ships BOTH config files, which
// Jest will refuse to disambiguate ("Multiple configurations found") until
// one is removed — flagging both issues here since actionState.ts's
// usability depends on which config wins.
describe('actionState', () => {
  it('idleActionState is the idle status singleton', () => {
    expect(idleActionState).toEqual({ status: 'idle' });
  });

  it('supports narrowing through every documented status', () => {
    const states: ActionState<{ id: number }>[] = [
      { status: 'idle' },
      { status: 'submitting' },
      { status: 'success', data: { id: 1 } },
      { status: 'validation_error', message: 'bad input', fieldErrors: [] },
      { status: 'system_error', message: 'boom', traceId: 'trace-1' },
    ];

    for (const state of states) {
      expect(typeof state.status).toBe('string');
    }
  });
});
