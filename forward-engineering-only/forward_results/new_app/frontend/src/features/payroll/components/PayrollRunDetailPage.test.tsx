import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PayrollRunDetailPage } from './PayrollRunDetailPage';
import { usePayrollRunDetail } from '../hooks/usePayrollRunDetail';
import { ApiError } from '../../../shared/api/types';

jest.mock('../hooks/usePayrollRunDetail');

const mockedUseDetail = usePayrollRunDetail as jest.Mock;

function renderAtRun(runId: string) {
  return render(
    <MemoryRouter initialEntries={[`/payroll-runs/${runId}`]}>
      <Routes>
        <Route path="/payroll-runs/:runId" element={<PayrollRunDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PayrollRunDetailPage', () => {
  beforeEach(() => {
    mockedUseDetail.mockReset();
  });

  it('requests the run detail using the runId route param', () => {
    mockedUseDetail.mockReturnValue({ payrollRun: null, isLoading: true, error: null });
    renderAtRun('42');
    expect(mockedUseDetail).toHaveBeenCalledWith('42');
  });

  it('renders the run status, totals, and pay period reference', () => {
    mockedUseDetail.mockReturnValue({
      payrollRun: {
        id: '42',
        payPeriodId: '10',
        status: 'COMPLETED',
        initiatedAt: '2026-06-21T00:00:00Z',
        completedAt: '2026-06-21T01:00:00Z',
        totalGrossAmount: 125000.5,
        totalNetAmount: 98000.25,
        failureReason: null,
      },
      isLoading: false,
      error: null,
    });
    renderAtRun('42');
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    expect(screen.getByText(/125000.5|125,000.50/)).toBeInTheDocument();
  });

  it('surfaces the failure reason for a failed run', () => {
    mockedUseDetail.mockReturnValue({
      payrollRun: {
        id: '43',
        payPeriodId: '10',
        status: 'FAILED',
        initiatedAt: '2026-06-21T00:00:00Z',
        completedAt: '2026-06-21T00:05:00Z',
        totalGrossAmount: null,
        totalNetAmount: null,
        failureReason: 'Downstream tax service timed out',
      },
      isLoading: false,
      error: null,
    });
    renderAtRun('43');
    expect(screen.getByText(/Downstream tax service timed out/)).toBeInTheDocument();
  });

  it('renders a not-found state when the run does not exist', () => {
    const error = new ApiError('Payroll run not found.', 404, 'PAYROLL_RUN_NOT_FOUND', 'trace-404');
    mockedUseDetail.mockReturnValue({ payrollRun: null, isLoading: false, error });
    renderAtRun('999');
    expect(screen.getByText(/not found/i)).toBeInTheDocument();
  });
});
