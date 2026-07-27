import type { ReactNode } from 'react';
import { useAuth } from './useAuth';
import type { Role } from './roles';
import { NotAuthorized } from '../components/NotAuthorized';

interface RequireRoleProps {
  allowedRoles: Role[];
  children: ReactNode;
}

// Route-level convenience only. The authoritative RBAC check lives server-side
// (Security Architecture §3 / @PreAuthorize) — this exists so an unauthorized
// role never even sees the screen render, per that same modernization requirement.
export function RequireRole({ allowedRoles, children }: RequireRoleProps) {
  const { user } = useAuth();
  const hasAccess = !!user && user.roles.some((role) => allowedRoles.includes(role));

  if (!hasAccess) {
    return <NotAuthorized />;
  }

  return <>{children}</>;
}
