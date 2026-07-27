import { render, screen } from '@testing-library/react';
import { ActionFeedback } from './ActionFeedback';

describe('ActionFeedback', () => {
  it('renders nothing when there is no result', () => {
    const { container } = render(<ActionFeedback result={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders a success banner for a success result', () => {
    render(<ActionFeedback result={{ kind: 'success', data: undefined }} successMessage="Leave request submitted." />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('feedback-success');
    expect(alert).toHaveTextContent('Leave request submitted.');
  });

  it('renders a validation banner with the message for a validation_error result', () => {
    render(<ActionFeedback result={{ kind: 'validation_error', message: 'Insufficient leave balance' }} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('feedback-validation');
    expect(alert).toHaveTextContent('Insufficient leave balance');
  });

  it('renders a system-error banner with the message for a system_error result', () => {
    render(<ActionFeedback result={{ kind: 'system_error', message: 'Unable to reach the server.' }} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('feedback-system-error');
    expect(alert).toHaveTextContent('Unable to reach the server.');
  });
});
