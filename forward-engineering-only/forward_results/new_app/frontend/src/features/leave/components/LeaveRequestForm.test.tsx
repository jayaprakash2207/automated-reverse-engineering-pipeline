import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeaveRequestForm } from './LeaveRequestForm';
import { useLeaveRequestActions } from '../hooks/useLeaveRequestActions';

jest.mock('../hooks/useLeaveRequestActions');

const mockedUseLeaveRequestActions = useLeaveRequestActions as jest.MockedFunction<typeof useLeaveRequestActions>;

function setActions(overrides: Partial<ReturnType<typeof useLeaveRequestActions>> = {}) {
  const submit = jest.fn();
  mockedUseLeaveRequestActions.mockReturnValue({
    submit,
    approve: jest.fn(),
    reject: jest.fn(),
    cancel: jest.fn(),
    ...overrides,
  });
  return submit;
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText(/leave type/i), 'ANNUAL');
  await user.type(screen.getByLabelText(/start date/i), '2026-08-10');
  await user.type(screen.getByLabelText(/end date/i), '2026-08-12');
  await user.type(screen.getByLabelText(/reason/i), 'Family trip');
}

describe('LeaveRequestForm', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders the leave type, date range, and reason fields', () => {
    setActions();
    render(<LeaveRequestForm onSubmitted={jest.fn()} />);

    expect(screen.getByLabelText(/leave type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/reason/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('blocks submission client-side when required fields are empty, without calling the API', async () => {
    const submit = setActions();
    const user = userEvent.setup();
    render(<LeaveRequestForm onSubmitted={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(submit).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toHaveClass('feedback-validation');
  });

  it('blocks submission client-side when the end date is before the start date', async () => {
    const submit = setActions();
    const user = userEvent.setup();
    render(<LeaveRequestForm onSubmitted={jest.fn()} />);

    await user.selectOptions(screen.getByLabelText(/leave type/i), 'ANNUAL');
    await user.type(screen.getByLabelText(/start date/i), '2026-08-12');
    await user.type(screen.getByLabelText(/end date/i), '2026-08-10');
    await user.type(screen.getByLabelText(/reason/i), 'Bad range');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(submit).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toHaveClass('feedback-validation');
  });

  it('submits and shows success feedback, then resets the form, on a valid submission', async () => {
    const submit = setActions();
    submit.mockResolvedValueOnce({
      kind: 'success',
      data: { id: 'lr-1', status: 'PENDING' },
    });
    const onSubmitted = jest.fn();
    const user = userEvent.setup();
    render(<LeaveRequestForm onSubmitted={onSubmitted} />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => expect(submit).toHaveBeenCalledWith({
      leaveType: 'ANNUAL',
      startDate: '2026-08-10',
      endDate: '2026-08-12',
      reason: 'Family trip',
    }));
    expect(await screen.findByRole('alert')).toHaveClass('feedback-success');
    expect(onSubmitted).toHaveBeenCalledWith({ id: 'lr-1', status: 'PENDING' });
    expect(screen.getByLabelText(/reason/i)).toHaveValue('');
  });

  it('shows a validation_error response from the server (e.g. overlapping dates) without resetting the form', async () => {
    const submit = setActions();
    submit.mockResolvedValueOnce({
      kind: 'validation_error',
      message: 'Requested leave dates overlap with an existing leave request',
    });
    const user = userEvent.setup();
    render(<LeaveRequestForm onSubmitted={jest.fn()} />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /submit/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveClass('feedback-validation');
    expect(alert).toHaveTextContent(/overlap/i);
    expect(screen.getByLabelText(/reason/i)).toHaveValue('Family trip');
  });

  it('shows a system_error response as a system-error banner', async () => {
    const submit = setActions();
    submit.mockResolvedValueOnce({
      kind: 'system_error',
      message: 'Unable to reach the server. Check your connection and try again.',
    });
    const user = userEvent.setup();
    render(<LeaveRequestForm onSubmitted={jest.fn()} />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(await screen.findByRole('alert')).toHaveClass('feedback-system-error');
  });
});
