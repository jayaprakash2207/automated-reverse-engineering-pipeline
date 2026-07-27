import { render, screen } from '@testing-library/react';
import { ProvisionalBanner } from './ProvisionalBanner';

describe('ProvisionalBanner', () => {
  it('renders a visible non-production warning by default', () => {
    render(<ProvisionalBanner />);
    expect(screen.getByRole('status')).toHaveTextContent(/provisional|not.*production/i);
  });

  it('renders a custom message when provided', () => {
    render(<ProvisionalBanner message="Payroll rules pending business sign-off (OQ-003)" />);
    expect(screen.getByText(/OQ-003/)).toBeInTheDocument();
  });
});
