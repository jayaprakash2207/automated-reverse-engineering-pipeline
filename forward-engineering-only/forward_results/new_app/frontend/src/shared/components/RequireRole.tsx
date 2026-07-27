import React from 'react';
import { useCurrentUser } from '../auth/useCurrentUser';

interface RequireRoleProps {
  anyOf: string[];
  children: React.ReactNode;
}

export function RequireRole({ anyOf, children }: RequireRoleProps): JSX.Element {
  const user = useCurrentUser();

  if (!user) {
    return <AccessDenied reason="Sign in to view this page." />;
  }

  const hasAccess = user.roles.some((role) => anyOf.includes(role));
  if (!hasAccess) {
    return <AccessDenied reason="You do not have permission to view this page." />;
  }

  return <>{children}</>;
}

function AccessDenied({ reason }: { reason: string }): JSX.Element {
  return (
    <div role="alert" className="access-denied">
      {reason}
    </div>
  );
}
