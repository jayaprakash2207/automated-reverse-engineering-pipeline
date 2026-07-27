import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useAuth } from './useAuth';
import { AuthContext } from './AuthContext';

// Same blocking note as AuthContext.test.tsx: useAuth.ts imports AuthContext
// from './AuthContext', which itself imports the not-yet-delivered
// './jwtDecode' module, so this suite fails at collection time until that
// one-line import is fixed (or shared/auth/jwtDecode.ts is added).
describe('useAuth', () => {
  it('throws when used outside an AuthProvider', () => {
    const { result } = renderHook(() => {
      try {
        return useAuth();
      } catch (e) {
        return e;
      }
    });
    expect(result.current).toBeInstanceOf(Error);
    expect((result.current as Error).message).toMatch(/must be used within an AuthProvider/i);
  });

  it('returns the provided context value inside an AuthProvider', () => {
    const value = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
    };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current).toBe(value);
  });
});
