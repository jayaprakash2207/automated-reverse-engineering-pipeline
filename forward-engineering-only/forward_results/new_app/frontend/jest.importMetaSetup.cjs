// Stub import.meta for Jest (CommonJS) environment.
// Vite uses import.meta.env; Jest does not support it natively.
if (typeof globalThis.importMeta === 'undefined') {
  Object.defineProperty(globalThis, 'importMeta', { value: { env: {} } });
}
