import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmployeeLifecycleActionModal } from './EmployeeLifecycleActionModal';
import * as employeeApi from '../api/employeeApi';
import { ApiError } from '../../../shared/api/apiError';
import type { Employee } from '../types/employee';

jest.mock('../api/employeeApi');

const employee: Employee = {
  id: 1,
  employeeNumber: 'EMP-001',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  jobTitle: 'Engineer',
  department: 'Engineering',
  hireDate: '2020-01-01',
  status: 'ACTIVE',
  managerId: null,
  ssnLastFour: '1234',
};

describe('EmployeeLifecycleActionModal', () => {
  it('shows the success state with an audit entry id when the action succeeds', async () => {
    jest.spyOn(employeeApi, 'applyLifecycleAction').mockResolvedValue({
      employee: { ...employee, department: 'Sales' },
      historyEntry: {
        id: 10,
        employeeId: employee.id,
        changeType: 'TRANSFER',
        previousDepartment: 'Engineering',
        newDepartment: 'Sales',
        previousJobTitle: null,
        newJobTitle: null,
        effectiveDate: '2026-07-24',
        reason: null,
        changedAt: '2026-07-24T00:00:00Z',
        changedBy: 'manager@example.com',
      },
      auditEntryId: 'audit-123',
    });

    render(
      <EmployeeLifecycleActionModal employee={employee} changeType="TRANSFER" onClose={jest.fn()} onApplied={jest.fn()} />,
    );

    await userEvent.type(screen.getByLabelText(/new department/i), 'Sales');
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

    expect(await screen.findByText(/audit-123/)).toBeInTheDocument();
  });

  it('shows a validation error with field detail instead of a raw error', async () => {
    jest.spyOn(employeeApi, 'applyLifecycleAction').mockRejectedValue(
      new ApiError('VALIDATION', 400, {
        message: 'Effective date is invalid.',
        field_errors: [{ field: 'effectiveDate', message: 'must not be in the past' }],
      }),
    );

    render(
      <EmployeeLifecycleActionModal employee={employee} changeType="TRANSFER" onClose={jest.fn()} onApplied={jest.fn()} />,
    );

    await userEvent.type(screen.getByLabelText(/new department/i), 'Sales');
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('must not be in the past');
  });

  it('shows a generic system-failure message with a trace id, keeping the form open to retry', async () => {
    jest.spyOn(employeeApi, 'applyLifecycleAction').mockRejectedValue(
      new ApiError('SYSTEM', 500, { message: 'boom', trace_id: 'trace-abc' }),
    );

    render(
      <EmployeeLifecycleActionModal employee={employee} changeType="TRANSFER" onClose={jest.fn()} onApplied={jest.fn()} />,
    );

    await userEvent.type(screen.getByLabelText(/new department/i), 'Sales');
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

    expect(await screen.findByText(/trace-abc/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
  });
});
