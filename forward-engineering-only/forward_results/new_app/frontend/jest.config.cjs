module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleNameMapper: {
    '\\.(css|less|scss)$': '<rootDir>/jest.styleMock.cjs',
  },
  globals: {
    'ts-jest': {
      tsconfig: {
        module: 'CommonJS',
        target: 'ES2020',
      },
      // Replace import.meta.env at compile time so Jest (CJS) can handle it
      diagnostics: false,
    },
  },
  // Inject a global stub for import.meta so any file that uses it at runtime
  // gets an empty env object instead of a ReferenceError
  setupFiles: ['<rootDir>/jest.importMetaSetup.cjs'],
};
