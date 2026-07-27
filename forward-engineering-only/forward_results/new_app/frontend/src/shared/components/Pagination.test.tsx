import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('disables Previous on the first page and Next on the last page', () => {
    render(<Pagination page={0} totalPages={1} onPageChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('calls onPageChange with the next page index', async () => {
    const onPageChange = jest.fn();
    render(<Pagination page={0} totalPages={3} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('calls onPageChange with the previous page index', async () => {
    const onPageChange = jest.fn();
    render(<Pagination page={1} totalPages={3} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onPageChange).toHaveBeenCalledWith(0);
  });
});
