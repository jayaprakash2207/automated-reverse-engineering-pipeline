import { render, screen } from '@testing-library/react';
import { ActionResultBanner } from './ActionResultBanner';
import { ApiError } from '../../../shared/types/apiError';

describe('ActionResultBanner', () => {
  it('renders nothing while idle or submitting', () => {
    const { container } = render(
      <ActionResultBanner outcome={{ kind: 'idle' }} renderSuccess={() => null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows field-level messages when validation fails, not just a generic error', () => {
    const error = new ApiError({
      timestamp: '2026-07-25T00:00:00Z',
      status: 400,
      error_code: 'VALIDATION_ERROR',
      message: 'Request is invalid',
      path: '/api/v1/employees/1/transfers',
      trace_id: 'trace-1',
      field_errors: [{ field: 'new_department', message: 'must not be blank' }],
    });

    render(
      <ActionResultBanner outcome={{ kind: 'validation_failure', error }} renderSuccess={() => null} />,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/must not be blank/)).toBeInTheDocument();
  });

  it('shows a trace id for system failures instead of a raw error code', () => {
    const error = new ApiError({
      timestamp: '2026-07-25T00:00:00Z',
      status: 500,
      error_code: 'INTERNAL_ERROR',
      message: 'boom',
      path: '/api/v1/employees/1/transfers',
      trace_id: 'trace-xyz',
    });

    render(
      <ActionResultBanner outcome={{ kind: 'system_failure', error }} renderSuccess={() => null} />,
    );

    expect(screen.getByText(/trace-xyz/)).toBeInTheDocument();
    expect(screen.queryByText('INTERNAL_ERROR')).not.toBeInTheDocument();
  });

  it('renders the caller-provided success view with the result', () => {
    render(
      <ActionResultBanner
        outcome={{ kind: 'success', result: { historyEntryId: 42 } }}
        renderSuccess={(r) => <span>history entry #{r.historyEntryId}</span>}
      />,
    );

    expect(screen.getByText(/history entry #42/)).toBeInTheDocument();
  });
});
