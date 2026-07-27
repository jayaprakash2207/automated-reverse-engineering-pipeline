import { ApiError } from '../types/apiError';

/**
 * The "system failure" half of the UI/UX Spec (Document 20) §3 contract for
 * read paths: generic retry message with a trace id, never a raw error code
 * or a blank/frozen screen.
 */
interface ErrorStateProps {
  error: ApiError;
  onRetry?: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="error-state">
      <p>We couldn&apos;t load this. Please try again.</p>
      <p className="error-state__trace">Reference ID: {error.traceId}</p>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
