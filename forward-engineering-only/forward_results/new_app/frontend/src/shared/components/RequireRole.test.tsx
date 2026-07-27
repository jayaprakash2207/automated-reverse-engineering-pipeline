import { render, screen } from '@testing-library/react';
import { RequireRole } from './RequireRole';
import { useCurrentUser } from '../auth/useCurrentUser';

jest.mock('../auth/useCurrentUser', () => ({
  useCurrentUser: jest.fn(),
}));

const mockUseCurrentUser = useCurrentUser as jest.Mock;

function renderGate(anyOf: string[]) {
  return render(
    <RequireRole anyOf={anyOf}>
      <div>Protected Content</div>
    </RequireRole>
  );
}

describe('RequireRole', () => {
  afterEach(() => {
    mockUseCurrentUser.mockReset();
  });

  it('denies access with a sign-in prompt when there is no current user', () => {
    mockUseCurrentUser.mockReturnValue(null);

    renderGate(['ADMIN']);

    expect(screen.getByRole('alert')).toHaveTextContent('Sign in to view this page.');
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('denies access with a permission message when the user holds none of the required roles', () => {
    mockUseCurrentUser.mockReturnValue({ userId: 'u-1', roles: ['EMPLOYEE'] });

    renderGate(['ADMIN', 'MANAGER']);

    expect(screen.getByRole('alert')).toHaveTextContent('You do not have permission to view this page.');
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders the protected content when the user holds one of the required roles', () => {
    mockUseCurrentUser.mockReturnValue({ userId: 'u-2', roles: ['ADMIN'] });

    renderGate(['ADMIN', 'MANAGER']);

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders the protected content when the user holds any one of several required roles, not just the first', () => {
    mockUseCurrentUser.mockReturnValue({ userId: 'u-3', roles: ['MANAGER'] });

    renderGate(['ADMIN', 'MANAGER', 'HR_ADMIN']);

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('denies access when the user has roles but the allow-list is empty', () => {
    mockUseCurrentUser.mockReturnValue({ userId: 'u-4', roles: ['ADMIN'] });

    renderGate([]);

    expect(screen.getByRole('alert')).toHaveTextContent('You do not have permission to view this page.');
  });
});
