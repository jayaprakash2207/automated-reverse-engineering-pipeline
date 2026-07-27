import { render, screen } from '@testing-library/react';
import { PayPeriodListPage } from './PayPeriodListPage';
import { usePayPeriods } from '../hooks/usePayPeriods';
import { ApiError } from '../../../shared/api/types';

jest.mock('../hooks/usePayPeriods');

const mockedUsePayPeriods = usePayPeriods as jest.Mock;

describe('PayPeriodListPage', () => {
  beforeEach(() => {
    mockedUsePayPeriods.mockReset();
  });

  it('shows the provisional banner regardless of data state', () => {
    mockedUsePayPeriods.mockReturnValue({ payPeriods: [], isLoading: false, error: null });
    render(<PayPeriodListPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders a loading indicator while fetching', () => {
    mockedUsePayPeriods.mockReturnValue({ payPeriods: [], isLoading: true, error: null });
    render(<PayPeriodListPage />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders each pay period with its status badge', () => {
    mockedUsePayPeriods.mockReturnValue({
      payPeriods: [
        { id: '1', startDate: '2026-06-01', endDate: '2026-06-15', payDate: '2026-06-20', status: 'CLOSED' },
        { id: '2', startDate: '2026-07-01', endDate: '2026-07-15', payDate: '2026-07-20', status: 'OPEN' },
      ],
      isLoading: false,
      error: null,
    });
    render(<PayPeriodListPage />);
    expect(screen.getByText('2026-06-01')).toBeInTheDocument();
    expect(screen.getByText('CLOSED')).toBeInTheDocument();
    expect(screen.getByText('OPEN')).toBeInTheDocument();
  });

  it('renders an empty state when there are no pay periods', () => {
    mockedUsePayPeriods.mockReturnValue({ payPeriods: [], isLoading: false, error: null });
    render(<PayPeriodListPage />);
    expect(screen.getByText(/no pay periods/i)).toBeInTheDocument();
  });

  it('surfaces a system error banner when the fetch fails', () => {
    const error = new ApiError('Unable to reach the server. Please try again.', 0);
    mockedUsePayPeriods.mockReturnValue({ payPeriods: [], isLoading: false, error });
    render(<PayPeriodListPage />);
    expect(screen.getByText(/unable to reach the server/i)).toBeInTheDocument();
  });
});
