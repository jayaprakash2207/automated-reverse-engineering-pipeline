import { render, screen } from '@testing-library/react';
import { ActionResultBanner } from './ActionResultBanner';
import { ActionState } from '../hooks/useAuditedAction';

describe('ActionResultBanner', () => {
  it('renders nothing when idle', () => {
    const state: ActionState<unknown> = { status: 'idle' };
    const { container } = render(<ActionResultBanner state={state} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the audit entry id on success', () => {
    const state: ActionState<{ id: string }> = { status: 'success', data: { id: '1' }, auditEntryId: 'audit-123' };
    render(<ActionResultBanner state={state} />);
    expect(screen.getByRole('status')).toHaveTextContent('Audit ID: audit-123');
  });

  it('lists field errors on validation failure', () => {
    const state: ActionState<unknown> = {
      status: 'validation-failure',
      message: 'Fix the highlighted fields',
      fieldErrors: { reason: 'must not be blank' },
    };
    render(<ActionResultBanner state={state} />);
    expect(screen.getByRole('alert')).toHaveTextContent('reason');
    expect(screen.getByRole('alert')).toHaveTextContent('must not be blank');
  });

  it('offers a retry action on system failure and never claims success', () => {
    const onRetry = jest.fn();
    const state: ActionState<unknown> = {
      status: 'system-failure',
      message: 'Something went wrong on our end. Please try again.',
      traceId: 'trace-1',
    };
    render(<ActionResultBanner state={state} onRetry={onRetry} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('trace-1');
    screen.getByRole('button', { name: 'Retry' }).click();
    expect(onRetry).toHaveBeenCalled();
  });
});
