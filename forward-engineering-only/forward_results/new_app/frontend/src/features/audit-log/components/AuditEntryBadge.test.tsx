import { render, screen } from '@testing-library/react';
import { AuditEntryBadge } from './AuditEntryBadge';

describe('AuditEntryBadge', () => {
  it('shows the audit entry id', () => {
    render(<AuditEntryBadge auditEntryId="audit-42" />);
    expect(screen.getByText(/audit-42/)).toBeInTheDocument();
  });

  it('reflects a failure result in its styling class', () => {
    render(<AuditEntryBadge auditEntryId="audit-42" result="FAILURE" />);
    expect(screen.getByText(/audit-42/).className).toContain('audit-entry-badge--failure');
  });
});
