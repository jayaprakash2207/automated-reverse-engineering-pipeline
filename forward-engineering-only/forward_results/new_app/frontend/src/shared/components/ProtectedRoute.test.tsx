import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth } from '../../features/auth/hooks/useAuth';

jest.mock('../../features/auth/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.Mock;

function renderProtectedRoute() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div>Secret Content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  afterEach(() => {
    mockUseAuth.mockReset();
  });

  it('shows a loading indicator while the auth state is initializing', () => {
    mockUseAuth.mockReturnValue({ isInitializing: true, isAuthenticated: false });

    renderProtectedRoute();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('renders the protected content once authenticated', () => {
    mockUseAuth.mockReturnValue({ isInitializing: false, isAuthenticated: true });

    renderProtectedRoute();

    expect(screen.getByText('Secret Content')).toBeInTheDocument();
  });

  it('redirects to /login when the user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ isInitializing: false, isAuthenticated: false });

    renderProtectedRoute();

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
  });
});
