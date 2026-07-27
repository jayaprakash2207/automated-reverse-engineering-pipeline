import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApprovalRow } from './ApprovalRow';
import type { LeaveRequestDto } from '../types/leaveRequest';

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

function renderRow(request: LeaveRequestDto, onApprove = jest.fn(), onReject = jest.fn()) {
  return render(
    <table>
      <tbody>
        <ApprovalRow request={request} onApprove={onApprove} onReject={onReject} />
      </tbody>
    </table>
  );
}

describe('ApprovalRow', () => {
  it('renders the employee, leave type, date range, and days requested', () => {
    renderRow(pendingDto());

    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('ANNUAL')).toBeInTheDocument();
    expect(screen.getByText(/2026-08-10/)).toBeInTheDocument();
    expect(screen.getByText(/2026-08-12/)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('invokes onApprove with the request id when Approve is clicked', async () => {
    const onApprove = jest.fn();
    const user = userEvent.setup();
    renderRow(pendingDto({ id: 'lr-42' }), onApprove);

    await user.click(screen.getByRole('button', { name: /approve/i }));

    expect(onApprove).toHaveBeenCalledWith('lr-42');
  });

  it('invokes onReject with the request id when Reject is clicked', async () => {
    const onReject = jest.fn();
    const user = userEvent.setup();
    renderRow(pendingDto({ id: 'lr-42' }), jest.fn(), onReject);

    await user.click(screen.getByRole('button', { name: /reject/i }));

    expect(onReject).toHaveBeenCalledWith('lr-42');
  });
});
