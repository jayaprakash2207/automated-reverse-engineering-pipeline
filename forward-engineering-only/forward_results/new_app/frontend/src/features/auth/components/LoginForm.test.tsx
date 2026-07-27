import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';
import { useAuth } from '../../../shared/auth/useAuth';

jest.mock('../../../shared/auth/useAuth');

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

function setUseAuth(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  mockedUseAuth.mockReturnValue({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: jest.fn().mockResolvedValue(undefined),
    logout: jest.fn(),
    ...overrides,
  });
}

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders an email field, a password field, and a submit button', () => {
    setUseAuth();

    render(<LoginForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in|log in/i })).toBeInTheDocument();
  });

  it('shows field-level validation errors and does not call login when submitted empty', async () => {
    const login = jest.fn();
    setUseAuth({ login });
    const user = userEvent.setup();

    render(<LoginForm />);
    await user.click(screen.getByRole('button', { name: /sign in|log in/i }));

    expect(await screen.findAllByRole('alert')).not.toHaveLength(0);
    expect(login).not.toHaveBeenCalled();
  });

  it('rejects a malformed email address before calling login', async () => {
    const login = jest.fn();
    setUseAuth({ login });
    const user = userEvent.setup();

    render(<LoginForm />);
    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.type(screen.getByLabelText(/password/i), 'some-password');
    await user.click(screen.getByRole('button', { name: /sign in|log in/i }));

    expect(login).not.toHaveBeenCalled();
  });

  it('calls login with the entered email and password on valid submit', async () => {
    const login = jest.fn().mockResolvedValue(undefined);
    setUseAuth({ login });
    const user = userEvent.setup();

    render(<LoginForm />);
    await user.type(screen.getByLabelText(/email/i), 'person@example.com');
    await user.type(screen.getByLabelText(/password/i), 'correct-password');
    await user.click(screen.getByRole('button', { name: /sign in|log in/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('person@example.com', 'correct-password');
    });
  });

  it('displays a form-level error message when login rejects', async () => {
    const login = jest.fn().mockRejectedValue(new Error('Invalid email or password.'));
    setUseAuth({ login });
    const user = userEvent.setup();

    render(<LoginForm />);
    await user.type(screen.getByLabelText(/email/i), 'person@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /sign in|log in/i }));

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
  });

  it('disables the submit button while the login request is in flight', async () => {
    let resolveLogin: () => void = () => {};
    const login = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveLogin = resolve;
        })
    );
    setUseAuth({ login });
    const user = userEvent.setup();

    render(<LoginForm />);
    await user.type(screen.getByLabelText(/email/i), 'person@example.com');
    await user.type(screen.getByLabelText(/password/i), 'correct-password');
    await user.click(screen.getByRole('button', { name: /sign in|log in/i }));

    expect(screen.getByRole('button', { name: /sign in|log in/i })).toBeDisabled();

    resolveLogin();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in|log in/i })).not.toBeDisabled();
    });
  });
});
