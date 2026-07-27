import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth } from './useAuth';

jest.mock('./useAuth');

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

function renderProtectedRoute(overrides: Partial<ReturnType<typeof useAuth>>) {
  mockedUseAuth.mockReturnValue({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
    ...overrides,
  });

  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/login" element={<div>Login Screen</div>} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the protected children when the user is authenticated', () => {
    renderProtectedRoute({ isAuthenticated: true, isLoading: false });

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects to /login when the user is not authenticated', () => {
    renderProtectedRoute({ isAuthenticated: false, isLoading: false });

    expect(screen.getByText('Login Screen')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('shows a loading state instead of redirecting while the session is still resolving', () => {
    renderProtectedRoute({ isAuthenticated: false, isLoading: true });

    expect(screen.queryByText('Login Screen')).not.toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
