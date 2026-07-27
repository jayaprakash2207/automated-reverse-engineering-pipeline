import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreatePayrollRunForm } from './CreatePayrollRunForm';
import { usePayPeriods } from '../hooks/usePayPeriods';
import { useCreatePayrollRun } from '../hooks/useCreatePayrollRun';
import { ApiError } from '../../../shared/api/types';

jest.mock('../hooks/usePayPeriods');
jest.mock('../hooks/useCreatePayrollRun');

const mockedUsePayPeriods = usePayPeriods as jest.Mock;
const mockedUseCreatePayrollRun = useCreatePayrollRun as jest.Mock;

describe('CreatePayrollRunForm', () => {
  const createPayrollRun = jest.fn();

  beforeEach(() => {
    createPayrollRun.mockReset();
    mockedUsePayPeriods.mockReturnValue({
      payPeriods: [
        { id: '10', startDate: '2026-06-01', endDate: '2026-06-15', payDate: '2026-06-20', status: 'CLOSED' },
      ],
      isLoading: false,
      error: null,
    });
    mockedUseCreatePayrollRun.mockReturnValue({
      createPayrollRun,
      isSubmitting: false,
      error: null,
    });
  });

  it('only offers closed pay periods as eligible options', () => {
    mockedUsePayPeriods.mockReturnValue({
      payPeriods: [
        { id: '10', startDate: '2026-06-01', endDate: '2026-06-15', payDate: '2026-06-20', status: 'CLOSED' },
        { id: '11', startDate: '2026-07-01', endDate: '2026-07-15', payDate: '2026-07-20', status: 'OPEN' },
      ],
      isLoading: false,
      error: null,
    });
    render(<CreatePayrollRunForm />);
    expect(screen.queryByRole('option', { name: /2026-07-01/ })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: /2026-06-01/ })).toBeInTheDocument();
  });

  it('shows guidance and disables submission when there are no eligible closed pay periods', () => {
    mockedUsePayPeriods.mockReturnValue({ payPeriods: [], isLoading: false, error: null });
    render(<CreatePayrollRunForm />);
    expect(screen.getByRole('button', { name: /create/i })).toBeDisabled();
    expect(screen.getByText(/no closed pay periods/i)).toBeInTheDocument();
  });

  it('blocks submission and shows a validation message when no pay period is selected', async () => {
    const user = userEvent.setup();
    render(<CreatePayrollRunForm />);

    await user.click(screen.getByRole('button', { name: /create/i }));

    expect(await screen.findByText(/select a pay period/i)).toBeInTheDocument();
    expect(createPayrollRun).not.toHaveBeenCalled();
  });

  it('submits the selected pay period id', async () => {
    createPayrollRun.mockResolvedValue({ id: '1', payPeriodId: '10', status: 'PENDING' });
    const user = userEvent.setup();
    render(<CreatePayrollRunForm />);

    await user.selectOptions(screen.getByLabelText(/pay period/i), '10');
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => expect(createPayrollRun).toHaveBeenCalledWith('10'));
  });

  it('shows a success banner after the run is created', async () => {
    createPayrollRun.mockResolvedValue({ id: '1', payPeriodId: '10', status: 'PENDING' });
    const user = userEvent.setup();
    render(<CreatePayrollRunForm />);

    await user.selectOptions(screen.getByLabelText(/pay period/i), '10');
    await user.click(screen.getByRole('button', { name: /create/i }));

    expect(await screen.findByText(/payroll run created/i)).toBeInTheDocument();
  });

  it('disables the submit button while the request is in flight', () => {
    mockedUseCreatePayrollRun.mockReturnValue({
      createPayrollRun,
      isSubmitting: true,
      error: null,
    });
    render(<CreatePayrollRunForm />);
    expect(screen.getByRole('button', { name: /create/i })).toBeDisabled();
  });

  it('surfaces a conflict error from the API (duplicate active run)', () => {
    const error = new ApiError(
      'A payroll run is already in progress for this pay period.',
      409,
      'PAYROLL_RUN_ALREADY_ACTIVE',
      'trace-409'
    );
    mockedUseCreatePayrollRun.mockReturnValue({ createPayrollRun, isSubmitting: false, error });
    render(<CreatePayrollRunForm />);
    expect(screen.getByText(/already in progress/i)).toBeInTheDocument();
  });

  it('surfaces field-level validation errors from the API', () => {
    const error = new ApiError('Validation failed.', 400, 'VALIDATION_ERROR', 'trace-400', {
      payPeriodId: 'must not be null',
    });
    mockedUseCreatePayrollRun.mockReturnValue({ createPayrollRun, isSubmitting: false, error });
    render(<CreatePayrollRunForm />);
    expect(screen.getByText(/must not be null/i)).toBeInTheDocument();
  });

  it('surfaces the traceId for an unexpected system failure', () => {
    const error = new ApiError('An unexpected error occurred.', 500, 'INTERNAL_ERROR', 'trace-500');
    mockedUseCreatePayrollRun.mockReturnValue({ createPayrollRun, isSubmitting: false, error });
    render(<CreatePayrollRunForm />);
    expect(screen.getByText(/trace-500/)).toBeInTheDocument();
  });
});
