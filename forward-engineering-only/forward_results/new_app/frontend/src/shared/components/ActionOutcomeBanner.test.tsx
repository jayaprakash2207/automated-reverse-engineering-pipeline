import { render, screen } from '@testing-library/react';
import { ActionOutcomeBanner } from './ActionOutcomeBanner';

describe('ActionOutcomeBanner', () => {
  it('renders nothing when there is no outcome yet', () => {
    const { container } = render(<ActionOutcomeBanner outcome={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the audit entry id when the action succeeds', () => {
    render(<ActionOutcomeBanner outcome={{ status: 'success', data: {}, auditEntryId: 'audit-123' }} />);
    expect(screen.getByRole('status')).toHaveTextContent('audit-123');
  });

  it('lists field errors when validation fails', () => {
    render(
      <ActionOutcomeBanner
        outcome={{ status: 'validationFailure', fieldErrors: { reason: 'Reason is required' } }}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('reason: Reason is required');
  });

  it('shows a generic retry message and trace id on system failure, never a raw error code', () => {
    render(
      <ActionOutcomeBanner
        outcome={{
          status: 'systemFailure',
          traceId: 'trace-789',
          message: 'The action could not be completed. Please retry.',
        }}
      />
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('The action could not be completed. Please retry.');
    expect(alert).toHaveTextContent('trace-789');
  });
});
