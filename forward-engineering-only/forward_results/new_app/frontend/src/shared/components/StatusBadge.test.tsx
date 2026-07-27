import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders the raw status text', () => {
    render(<StatusBadge status="COMPLETED" />);
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
  });

  it.each([
    ['CLOSED', 'success'],
    ['COMPLETED', 'success'],
    ['OPEN', 'neutral'],
    ['PENDING', 'neutral'],
    ['PROCESSING', 'warning'],
    ['FAILED', 'danger'],
  ])('applies the %s tone class for status %s', (status, tone) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(status)).toHaveClass(`status-badge--${tone}`);
  });

  it('falls back to the neutral tone for an unrecognized status', () => {
    render(<StatusBadge status="UNKNOWN_STATUS" />);
    expect(screen.getByText('UNKNOWN_STATUS')).toHaveClass('status-badge--neutral');
  });
});
