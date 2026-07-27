import { render, screen } from '@testing-library/react';
import { AuthContext } from './AuthContext';
import { RequireRole } from './RequireRole';
import { ROLES } from './roles';

function renderWithUser(roles: string[] | null) {
  const value = {
    user: roles ? { userId: '1', email: 'reviewer@example.com', roles } : null,
    logout: jest.fn(),
  };
  return render(
    <AuthContext.Provider value={value as any}>
      <RequireRole allowedRoles={[ROLES.SYSTEM_AUDIT_REVIEWER]}>
        <div>Protected content</div>
      </RequireRole>
    </AuthContext.Provider>
  );
}

describe('RequireRole', () => {
  it('renders the protected content when the user has an allowed role', () => {
    renderWithUser([ROLES.SYSTEM_AUDIT_REVIEWER]);
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('renders the access-restricted fallback for a role that is not allowed, e.g. Manager', () => {
    renderWithUser([ROLES.MANAGER]);
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
  });

  it('renders the fallback when there is no authenticated user at all', () => {
    renderWithUser(null);
    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
  });
});
