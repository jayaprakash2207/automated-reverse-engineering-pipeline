import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LifecycleActionPanel } from './LifecycleActionPanel';
import * as employeeLifecycleApi from '../api/employeeLifecycleApi';

jest.mock('../api/employeeLifecycleApi');

describe('LifecycleActionPanel', () => {
  it('shows the audit entry id after a successful submission', async () => {
    jest.spyOn(employeeLifecycleApi, 'submitLifecycleAction').mockResolvedValue({
      status: 'SUCCESS',
      auditEntryId: 'audit-789',
    });

    render(<LifecycleActionPanel employeeId="emp-1" />);
    fireEvent.change(screen.getByLabelText('Effective date'), { target: { value: '2026-08-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(screen.getByTestId('action-banner-success')).toHaveTextContent('audit-789'));
  });

  it('shows a system-failure state with a trace id instead of a raw error when the request throws', async () => {
    jest.spyOn(employeeLifecycleApi, 'submitLifecycleAction').mockRejectedValue(new Error('network down'));

    render(<LifecycleActionPanel employeeId="emp-1" />);
    fireEvent.change(screen.getByLabelText('Effective date'), { target: { value: '2026-08-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(screen.getByTestId('action-banner-system-failure')).toBeInTheDocument());
  });

  it('never surfaces success without an audit entry id, even if the backend omits one', async () => {
    jest.spyOn(employeeLifecycleApi, 'submitLifecycleAction').mockResolvedValue({
      status: 'SUCCESS',
    });

    render(<LifecycleActionPanel employeeId="emp-1" />);
    fireEvent.change(screen.getByLabelText('Effective date'), { target: { value: '2026-08-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(screen.getByTestId('action-banner-system-failure')).toBeInTheDocument());
    expect(screen.queryByTestId('action-banner-success')).not.toBeInTheDocument();
  });

  it('shows validation errors returned by the backend as a validation banner, not a success or a crash', async () => {
    jest.spyOn(employeeLifecycleApi, 'submitLifecycleAction').mockResolvedValue({
      status: 'VALIDATION_FAILURE',
      message: 'The effective date must be in the future.',
      fieldErrors: { effectiveDate: 'Effective date must be in the future.' },
    });

    render(<LifecycleActionPanel employeeId="emp-1" />);
    fireEvent.change(screen.getByLabelText('Effective date'), { target: { value: '2020-01-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(screen.getByTestId('action-banner-validation')).toBeInTheDocument());
    expect(screen.getByText(/Effective date must be in the future/)).toBeInTheDocument();
  });

  it('submits the action type selected by the user and the employeeId prop, not a hard-coded default', async () => {
    const submit = jest
      .spyOn(employeeLifecycleApi, 'submitLifecycleAction')
      .mockResolvedValue({ status: 'SUCCESS', auditEntryId: 'audit-1' });

    render(<LifecycleActionPanel employeeId="emp-99" />);
    fireEvent.change(screen.getByLabelText('Action'), { target: { value: 'TERMINATE' } });
    fireEvent.change(screen.getByLabelText('Effective date'), { target: { value: '2026-08-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(submit).toHaveBeenCalled());
    expect(submit).toHaveBeenCalledWith({
      employeeId: 'emp-99',
      actionType: 'TERMINATE',
      effectiveDate: '2026-08-01',
    });
  });

  it('disables the submit button and shows a processing message while the request is in flight', async () => {
    let resolveSubmit!: (value: { status: 'SUCCESS'; auditEntryId: string }) => void;
    const pending = new Promise<{ status: 'SUCCESS'; auditEntryId: string }>((resolve) => {
      resolveSubmit = resolve;
    });
    jest.spyOn(employeeLifecycleApi, 'submitLifecycleAction').mockReturnValue(pending);

    render(<LifecycleActionPanel employeeId="emp-1" />);
    fireEvent.change(screen.getByLabelText('Effective date'), { target: { value: '2026-08-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
    expect(screen.getByText(/Processing transfer/i)).toBeInTheDocument();

    resolveSubmit({ status: 'SUCCESS', auditEntryId: 'audit-1' });
    await waitFor(() => expect(screen.getByTestId('action-banner-success')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Submit' })).not.toBeDisabled();
  });
});
