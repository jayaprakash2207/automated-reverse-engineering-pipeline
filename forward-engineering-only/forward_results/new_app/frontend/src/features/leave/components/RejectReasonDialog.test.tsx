import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RejectReasonDialog } from './RejectReasonDialog';

describe('RejectReasonDialog', () => {
  it('renders a reason textarea and confirm/cancel actions', () => {
    render(<RejectReasonDialog onConfirm={jest.fn()} onCancel={jest.fn()} />);

    expect(screen.getByLabelText(/reason/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('does not call onConfirm and shows a validation message when reason is blank', async () => {
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    render(<RejectReasonDialog onConfirm={onConfirm} onCancel={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /confirm/i }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText(/reason is required/i)).toBeInTheDocument();
  });

  it('does not call onConfirm when reason is only whitespace', async () => {
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    render(<RejectReasonDialog onConfirm={onConfirm} onCancel={jest.fn()} />);

    await user.type(screen.getByLabelText(/reason/i), '   ');
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls onConfirm with the trimmed reason when valid', async () => {
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    render(<RejectReasonDialog onConfirm={onConfirm} onCancel={jest.fn()} />);

    await user.type(screen.getByLabelText(/reason/i), '  Coverage conflict  ');
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    expect(onConfirm).toHaveBeenCalledWith('Coverage conflict');
  });

  it('calls onCancel when the cancel button is clicked, without calling onConfirm', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    const user = userEvent.setup();
    render(<RejectReasonDialog onConfirm={onConfirm} onCancel={onCancel} />);

    await user.type(screen.getByLabelText(/reason/i), 'Some reason');
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
