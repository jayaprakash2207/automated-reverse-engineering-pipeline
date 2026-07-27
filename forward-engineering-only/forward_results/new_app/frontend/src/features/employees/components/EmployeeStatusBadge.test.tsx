import { render, screen } from '@testing-library/react';
import { EmployeeStatusBadge } from './EmployeeStatusBadge';

describe('EmployeeStatusBadge', () => {
  it.each([
    ['ACTIVE', 'Active'],
    ['ON_LEAVE', 'On Leave'],
    ['TERMINATED', 'Terminated'],
  ] as const)('renders %s status as "%s"', (status, label) => {
    render(<EmployeeStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
