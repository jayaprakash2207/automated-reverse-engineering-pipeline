import { RequireRole } from '../../../shared/auth/RequireRole';
import { ROLES } from '../../../shared/auth/roles';
import { AuditLogViewer } from '../components/AuditLogViewer';

export function AuditLogPage() {
  return (
    <RequireRole allowedRoles={[ROLES.SYSTEM_AUDIT_REVIEWER]}>
      <AuditLogViewer />
    </RequireRole>
  );
}
