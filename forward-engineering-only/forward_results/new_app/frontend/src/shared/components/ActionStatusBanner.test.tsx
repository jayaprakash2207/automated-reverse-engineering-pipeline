import { render, screen } from '@testing-library/react';
import { ActionStatusBanner } from './ActionStatusBanner';

describe('ActionStatusBanner', () => {
  it('renders nothing when there is no status', () => {
    const { container } = render(<ActionStatusBanner status={null} message="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a success message', () => {
    render(<ActionStatusBanner status="success" message="Payroll run created." />);
    expect(screen.getByText('Payroll run created.')).toBeInTheDocument();
  });

  it('renders validation errors without a trace id', () => {
    render(
      <ActionStatusBanner
        status="validationError"
        message="Pay period is required."
        fieldErrors={{ payPeriodId: 'must not be null' }}
      />
    );
    expect(screen.getByText('Pay period is required.')).toBeInTheDocument();
    expect(screen.queryByText(/trace/i)).not.toBeInTheDocument();
  });

  it('surfaces the traceId and errorCode for a system failure', () => {
    render(
      <ActionStatusBanner
        status="systemError"
        message="An unexpected error occurred."
        errorCode="PAYROLL_RUN_CREATE_FAILED"
        traceId="abc-123-trace"
      />
    );
    expect(screen.getByText(/An unexpected error occurred\./)).toBeInTheDocument();
    expect(screen.getByText(/abc-123-trace/)).toBeInTheDocument();
    expect(screen.getByText(/PAYROLL_RUN_CREATE_FAILED/)).toBeInTheDocument();
  });
});
