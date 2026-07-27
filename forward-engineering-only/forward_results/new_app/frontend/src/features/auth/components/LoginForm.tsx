import { useId, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/auth/useAuth';
import { resolveLoginErrorMessage } from '../utils/authErrorMessage';

interface FieldErrors {
  email?: string;
  password?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!email.trim()) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address.';
  }
  // Password is always required — there is no "log in with just your work
  // email" shortcut (UI/UX Spec Doc 20 §4 explicitly forbids reintroducing
  // that pattern; PKG-SECURITY's unconditional-session defect is the
  // behavior being removed, not a precedent to preserve).
  if (!password) {
    errors.password = 'Password is required.';
  }
  return errors;
}

export function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const emailId = useId();
  const passwordId = useId();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const errors = validate(email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (error) {
      setSubmitError(resolveLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Sign in">
      <div>
        <label htmlFor={emailId}>Email</label>
        <input
          id={emailId}
          name="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? `${emailId}-error` : undefined}
          disabled={isSubmitting}
        />
        {fieldErrors.email && (
          <p id={`${emailId}-error`} role="alert">
            {fieldErrors.email}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={passwordId}>Password</label>
        <input
          id={passwordId}
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={fieldErrors.password ? `${passwordId}-error` : undefined}
          disabled={isSubmitting}
        />
        {fieldErrors.password && (
          <p id={`${passwordId}-error`} role="alert">
            {fieldErrors.password}
          </p>
        )}
      </div>

      {submitError && (
        <p role="alert" aria-live="assertive" data-testid="login-submit-error">
          {submitError}
        </p>
      )}

      <button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
