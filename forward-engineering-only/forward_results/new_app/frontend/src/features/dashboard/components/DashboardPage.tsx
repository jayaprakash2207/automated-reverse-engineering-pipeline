import { useAuth } from '../../../shared/auth/useAuth';

// Minimal authenticated landing page for this sprint's scope (Security/
// Identity Context) — proves the login -> protected route -> logout flow
// works end to end. Feature-specific dashboards (leave approvals, employee
// lifecycle actions, etc.) belong to their own sprints and are intentionally
// not built here.
export function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <main>
      <h1>Welcome{user ? `, ${user.email}` : ''}</h1>
      {user && user.roles.length > 0 && <p>Roles: {user.roles.join(', ')}</p>}
      <button type="button" onClick={logout}>
        Sign out
      </button>
    </main>
  );
}
