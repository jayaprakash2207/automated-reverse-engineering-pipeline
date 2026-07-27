import { render, screen } from '@testing-library/react';
import { PendingApprovalsIndicator } from './PendingApprovalsIndicator';
import { usePendingApprovals } from '../hooks/usePendingApprovals';
import type { LeaveRequestDto } from '../types/leaveRequest';

jest.mock('../hooks/usePendingApprovals');

const mockedUsePendingApprovals = usePendingApprovals as jest.MockedFunction<typeof usePendingApprovals>;

function pendingDto(id: string): LeaveRequestDto {
  return {
    id,
    employeeId: '100',
    leaveType: 'ANNUAL',
    startDate: '2026-08-10',
    endDate: '2026-08-12',
    daysRequested: 3,
    reason: 'Family trip',
    status: 'PENDING',
    managerId: '900',
    createdAt: '2026-07-24T00:00:00Z',
  };
}

describe('PendingApprovalsIndicator', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('shows a count badge when there are pending approvals', () => {
    mockedUsePendingApprovals.mockReturnValue({
      data: [pendingDto('lr-1'), pendingDto('lr-2')],
      loading: false,
      error: null,
      reload: jest.fn(),
    });

    render(<PendingApprovalsIndicator />);

    expect(screen.getByText('2')).toHaveClass('pending-approvals-count');
  });

  it('renders no badge when the pending queue is empty', () => {
    mockedUsePendingApprovals.mockReturnValue({
      data: [],
      loading: false,
      error: null,
      reload: jest.fn(),
    });

    render(<PendingApprovalsIndicator />);

    expect(screen.queryByText('0')).not.toBeInTheDocument();
    expect(document.querySelector('.pending-approvals-count')).not.toBeInTheDocument();
  });

  it('does not render a badge or crash while the queue is still loading', () => {
    mockedUsePendingApprovals.mockReturnValue({
      data: [],
      loading: true,
      error: null,
      reload: jest.fn(),
    });

    render(<PendingApprovalsIndicator />);

    expect(document.querySelector('.pending-approvals-count')).not.toBeInTheDocument();
  });

  it('fails silently (no badge, no crash) when the queue failed to load', () => {
    mockedUsePendingApprovals.mockReturnValue({
      data: [],
      loading: false,
      error: 'You do not have permission to view this resource.',
      reload: jest.fn(),
    });

    render(<PendingApprovalsIndicator />);

    expect(document.querySelector('.pending-approvals-count')).not.toBeInTheDocument();
  });
});
