import { render, screen } from '@testing-library/react';
import { ActionResultBanner } from './ActionResultBanner';

describe('ActionResultBanner', () => {
  it('renders nothing when idle', () => {
    const { container } = render(<ActionResultBanner outcome={{ status: 'idle' }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the audit entry id on success', () => {
    render(
      <ActionResultBanner outcome={{ status: 'success', message: 'Approved', auditEntryId: 'audit-999' }} />
    );
    expect(screen.getByText(/approved/i)).toBeInTheDocument();
    expect(screen.getByText(/audit-999/)).toBeInTheDocument();
  });

  it('lists field errors on validation failure', () => {
    render(
      <ActionResultBanner outcome={{ status: 'validationError', fieldErrors: { reason: 'Reason is required' } }} />
    );
    expect(screen.getByText(/reason is required/i)).toBeInTheDocument();
  });

  it('shows a generic retry message with a trace id on system failure, never a raw error code', () => {
    render(
      <ActionResultBanner
        outcome={{ status: 'systemError', message: 'Something went wrong. Please try again.', traceId: 'trace-1' }}
      />
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/trace-1/)).toBeInTheDocument();
  });
});
