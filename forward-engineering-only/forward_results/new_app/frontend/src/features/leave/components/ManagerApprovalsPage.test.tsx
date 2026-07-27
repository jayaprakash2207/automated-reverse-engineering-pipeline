import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManagerApprovalsPage } from './ManagerApprovalsPage';
import { usePendingApprovals } from '../hooks/usePendingApprovals';
import { useLeaveRequestActions } from '../hooks/useLeaveRequestActions';
import type { LeaveRequestDto } from '../types/leaveRequest';

jest.mock('../hooks/usePendingApprovals');
jest.mock('../hooks/useLeaveRequestActions');

const mockedUsePendingApprovals = usePendingApprovals as jest.MockedFunction<typeof usePendingApprovals>;
const mockedUseLeaveRequestActions = useLeaveRequestActions as jest.MockedFunction<typeof useLeaveRequestActions>;

function pendingDto(overrides: Partial<LeaveRequestDto> = {}): LeaveRequestDto {
  return {
    id: 'lr-1',
    employeeId: '100',
    leaveType: 'ANNUAL',
    startDate: '2026-08-10',
    endDate: '2026-08-12',
    daysRequested: 3,
    reason: 'Family trip',
    status: 'PENDING',
    managerId: '900',
    createdAt: '2026-07-24T00:00:00Z',
    ...overrides,
  };
}

function setPendingApprovals(overrides: Partial<ReturnType<typeof usePendingApprovals>> = {}) {
  const reload = jest.fn();
  mockedUsePendingApprovals.mockReturnValue({
    data: [],
    loading: false,
    error: null,
    reload,
    ...overrides,
  });
  return reload;
}

function setActions(overrides: Partial<ReturnType<typeof useLeaveRequestActions>> = {}) {
  const actions = {
    submit: jest.fn(),
    approve: jest.fn().mockResolvedValue({ kind: 'success', data: pendingDto({ status: 'APPROVED' }) }),
    reject: jest.fn().mockResolvedValue({ kind: 'success', data: pendingDto({ status: 'REJECTED' }) }),
    cancel: jest.fn(),
    ...overrides,
  };
  mockedUseLeaveRequestActions.mockReturnValue(actions);
  return actions;
}

describe('ManagerApprovalsPage', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('shows a loading indicator while the pending queue is loading', () => {
    setPendingApprovals({ loading: true, data: [] });
    setActions();

    render(<ManagerApprovalsPage />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows an empty state when there are no pending requests', () => {
    setPendingApprovals({ loading: false, data: [] });
    setActions();

    render(<ManagerApprovalsPage />);

    expect(screen.getByText(/no pending/i)).toBeInTheDocument();
  });

  it('renders one row per pending leave request', () => {
    setPendingApprovals({ loading: false, data: [pendingDto({ id: 'lr-1' }), pendingDto({ id: 'lr-2', employeeId: '200' })] });
    setActions();

    render(<ManagerApprovalsPage />);

    expect(screen.getAllByRole('row')).toHaveLength(3); // header + 2 rows
  });

  it('approving a request calls the approve action and reloads the queue on success', async () => {
    setPendingApprovals({ loading: false, data: [pendingDto()] });
    const actions = setActions();
    const user = userEvent.setup();

    render(<ManagerApprovalsPage />);
    await user.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => expect(actions.approve).toHaveBeenCalledWith('lr-1'));
    expect(await screen.findByRole('alert')).toHaveClass('feedback-success');
  });

  it('rejecting requires opening the reason dialog and entering a non-blank reason', async () => {
    setPendingApprovals({ loading: false, data: [pendingDto()] });
    const actions = setActions();
    const user = userEvent.setup();

    render(<ManagerApprovalsPage />);
    await user.click(screen.getByRole('button', { name: /reject/i }));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /confirm/i }));
    expect(actions.reject).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText(/reason/i), 'Coverage conflict');
    await user.click(within(dialog).getByRole('button', { name: /confirm/i }));

    await waitFor(() => expect(actions.reject).toHaveBeenCalledWith('lr-1', 'Coverage conflict'));
  });

  it('cancelling the reject dialog does not call the reject action', async () => {
    setPendingApprovals({ loading: false, data: [pendingDto()] });
    const actions = setActions();
    const user = userEvent.setup();

    render(<ManagerApprovalsPage />);
    await user.click(screen.getByRole('button', { name: /reject/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /cancel/i }));

    expect(actions.reject).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows a system-error banner when approve fails and keeps the row in the queue', async () => {
    setPendingApprovals({ loading: false, data: [pendingDto()] });
    const actions = setActions({
      approve: jest.fn().mockResolvedValue({ kind: 'system_error', message: 'Not authorized to act on this leave request' }),
    });
    const user = userEvent.setup();

    render(<ManagerApprovalsPage />);
    await user.click(screen.getByRole('button', { name: /approve/i }));

    expect(await screen.findByRole('alert')).toHaveClass('feedback-system-error');
    expect(actions.reload).not.toHaveBeenCalled();
  });
});
