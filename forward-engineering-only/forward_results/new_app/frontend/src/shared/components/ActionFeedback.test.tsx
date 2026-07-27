import React from 'react';
import { render, screen } from '@testing-library/react';
import { ActionFeedback } from './ActionFeedback';
import { ActionOutcome } from '../types/actionOutcome';

describe('ActionFeedback', () => {
  it('renders nothing when idle', () => {
    const { container } = render(<ActionFeedback outcome={{ status: 'idle' }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a pending indicator while processing', () => {
    render(<ActionFeedback outcome={{ status: 'pending' }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Processing...');
  });

  it('surfaces the audit entry id on success, per NFR-R2/VG-04', () => {
    const outcome: ActionOutcome<unknown> = { status: 'success', auditEntryId: 'audit-42', data: {} };
    render(<ActionFeedback outcome={outcome} />);
    expect(screen.getByText(/Audit entry: audit-42/)).toBeInTheDocument();
  });

  it('lists field-level messages on validation failure', () => {
    const outcome: ActionOutcome<unknown> = {
      status: 'validationError',
      fieldErrors: { reason: 'Reason is required' },
    };
    render(<ActionFeedback outcome={outcome} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Reason is required');
  });

  it('shows a generic retry message with the trace id on system failure, never a raw error code', () => {
    const outcome: ActionOutcome<unknown> = {
      status: 'systemError',
      message: 'Audit write failed. The request has not been approved.',
      traceId: 'trace-99',
    };
    render(<ActionFeedback outcome={outcome} />);
    expect(screen.getByRole('alert')).toHaveTextContent('trace-99');
  });
});
