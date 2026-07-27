import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { AuthProvider } from '../../../shared/auth/AuthContext';
import * as authApi from '../api/authApi';
import { ApiError } from '../../../shared/api/apiError';

jest.mock('../api/authApi');

function renderLoginPage() {
  render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  it('shows a visible failure state for wrong credentials instead of silently doing nothing', async () => {
    jest.spyOn(authApi, 'login').mockRejectedValue(new ApiError('AUTH', 401, { message: 'bad credentials' }));

    renderLoginPage();
    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/incorrect email or password/i);
  });

  it('shows account lockout messaging distinctly from a plain bad-credentials error', async () => {
    jest.spyOn(authApi, 'login').mockRejectedValue(
      new ApiError('AUTH', 401, { message: 'locked', error_code: 'ACCOUNT_LOCKED' }),
    );

    renderLoginPage();
    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/temporarily locked/i);
  });

  it('does not expose any email-only submit path', () => {
    renderLoginPage();
    expect(screen.getByLabelText(/password/i)).toBeRequired();
  });
});
