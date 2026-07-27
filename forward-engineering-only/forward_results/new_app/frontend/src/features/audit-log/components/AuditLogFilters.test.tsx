import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditLogFilters } from './AuditLogFilters';

describe('AuditLogFilters', () => {
  it('applies entered filter values on submit', async () => {
    const user = userEvent.setup();
    const onApply = jest.fn();
    render(<AuditLogFilters initialFilters={{}} onApply={onApply} />);

    await user.type(screen.getByLabelText('Actor'), 'Jane Doe');
    await user.click(screen.getByRole('button', { name: 'Apply filters' }));

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ actorName: 'Jane Doe', page: 0 }));
  });

  it('clears all fields and reapplies empty filters', async () => {
    const user = userEvent.setup();
    const onApply = jest.fn();
    render(<AuditLogFilters initialFilters={{ actorName: 'Jane Doe' }} onApply={onApply} />);

    await user.click(screen.getByRole('button', { name: 'Clear' }));

    expect(onApply).toHaveBeenCalledWith({ page: 0 });
  });
});
