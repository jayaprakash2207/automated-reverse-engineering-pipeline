import { render, screen, fireEvent } from '@testing-library/react';
import { AuditLogFilterBar } from './AuditLogFilterBar';

describe('AuditLogFilterBar', () => {
  it('renders the initial filter values', () => {
    render(
      <AuditLogFilterBar
        initialFilters={{ actorName: 'Jamie Rivera', entityType: 'LEAVE_REQUEST', outcome: 'SUCCESS' }}
        onApply={() => {}}
      />
    );

    expect(screen.getByLabelText('Actor')).toHaveValue('Jamie Rivera');
    expect(screen.getByLabelText('Entity type')).toHaveValue('LEAVE_REQUEST');
    expect(screen.getByLabelText('Result')).toHaveValue('SUCCESS');
  });

  it('calls onApply with the edited draft (not the stale initial filters) on submit', () => {
    const onApply = jest.fn();
    render(<AuditLogFilterBar initialFilters={{}} onApply={onApply} />);

    fireEvent.change(screen.getByLabelText('Actor'), { target: { value: 'Jamie Rivera' } });
    fireEvent.change(screen.getByLabelText('Entity type'), { target: { value: 'LEAVE_REQUEST' } });
    fireEvent.change(screen.getByLabelText('Result'), { target: { value: 'FAILURE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));

    expect(onApply).toHaveBeenCalledWith({
      actorName: 'Jamie Rivera',
      entityType: 'LEAVE_REQUEST',
      outcome: 'FAILURE',
    });
  });

  it('maps an emptied text field back to undefined rather than an empty string', () => {
    const onApply = jest.fn();
    render(<AuditLogFilterBar initialFilters={{ actorName: 'Jamie Rivera' }} onApply={onApply} />);

    fireEvent.change(screen.getByLabelText('Actor'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ actorName: undefined }));
  });

  it('offers Any/Success/Failure for the result filter and treats "Any" as undefined', () => {
    const onApply = jest.fn();
    render(<AuditLogFilterBar initialFilters={{ outcome: 'SUCCESS' }} onApply={onApply} />);

    expect(screen.getByRole('option', { name: 'Any' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Success' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Failure' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Result'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ outcome: undefined }));
  });
});
