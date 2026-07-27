import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PayrollRunListPage } from './PayrollRunListPage';
import { usePayrollRuns } from '../hooks/usePayrollRuns';
import { ApiError } from '../../../shared/api/types';

jest.mock('../hooks/usePayrollRuns');

const mockedUsePayrollRuns = usePayrollRuns as jest.Mock;

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('PayrollRunListPage', () => {
  beforeEach(() => {
    mockedUsePayrollRuns.mockReset();
  });

  it('links each run to its detail page', () => {
    mockedUsePayrollRuns.mockReturnValue({
      payrollRuns: [
        { id: '42', payPeriodId: '1', status: 'COMPLETED', initiatedAt: '2026-06-21T00:00:00Z' },
      ],
      isLoading: false,
      error: null,
    });
    renderWithRouter(<PayrollRunListPage />);
    expect(screen.getByRole('link', { name: /42/ })).toHaveAttribute('href', '/payroll-runs/42');
  });

  it('renders a create-run call to action', () => {
    mockedUsePayrollRuns.mockReturnValue({ payrollRuns: [], isLoading: false, error: null });
    renderWithRouter(<PayrollRunListPage />);
    expect(screen.getByRole('link', { name: /create/i })).toBeInTheDocument();
  });

  it('renders the loading state', () => {
    mockedUsePayrollRuns.mockReturnValue({ payrollRuns: [], isLoading: true, error: null });
    renderWithRouter(<PayrollRunListPage />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders a system error banner when the fetch fails', () => {
    const error = new ApiError('An unexpected error occurred.', 500, 'PAYROLL_RUN_LIST_FAILED', 'trace-1');
    mockedUsePayrollRuns.mockReturnValue({ payrollRuns: [], isLoading: false, error });
    renderWithRouter(<PayrollRunListPage />);
    expect(screen.getByText(/trace-1/)).toBeInTheDocument();
  });

  it('renders a status badge per run', () => {
    mockedUsePayrollRuns.mockReturnValue({
      payrollRuns: [
        { id: '1', payPeriodId: '1', status: 'FAILED', initiatedAt: '2026-06-21T00:00:00Z' },
      ],
      isLoading: false,
      error: null,
    });
    renderWithRouter(<PayrollRunListPage />);
    expect(screen.getByText('FAILED')).toBeInTheDocument();
  });
});
