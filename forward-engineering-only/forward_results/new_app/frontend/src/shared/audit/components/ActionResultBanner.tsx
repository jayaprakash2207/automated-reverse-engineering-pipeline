import { ActionState } from '../hooks/useAuditedAction';
import './ActionResultBanner.css';

export interface ActionResultBannerProps<T> {
  state: ActionState<T>;
  onRetry?: () => void;
  onDismiss?: () => void;
  renderSuccessMessage?: (data: T, auditEntryId: string) => string;
}

/**
 * Implements Doc 20 §3's three-state contract for mutating actions: success (with the
 * audit id visible), validation failure (field-level messages), or system failure
 * (generic retry message + trace id). Never a raw error code or a blank/frozen screen.
 */
export function ActionResultBanner<T>({
  state,
  onRetry,
  onDismiss,
  renderSuccessMessage,
}: ActionResultBannerProps<T>) {
  if (state.status === 'idle' || state.status === 'pending') {
    return null;
  }

  if (state.status === 'success') {
    const message = renderSuccessMessage
      ? renderSuccessMessage(state.data, state.auditEntryId)
      : 'Action completed and recorded.';

    return (
      <div className="action-result-banner action-result-banner--success" role="status" aria-live="polite">
        <p>{message}</p>
        <p className="action-result-banner__audit-id">Audit ID: {state.auditEntryId}</p>
        {onDismiss && (
          <button type="button" onClick={onDismiss}>
            Dismiss
          </button>
        )}
      </div>
    );
  }

  if (state.status === 'validation-failure') {
    return (
      <div className="action-result-banner action-result-banner--validation" role="alert" aria-live="assertive">
        <p>{state.message}</p>
        <ul>
          {Object.entries(state.fieldErrors).map(([field, message]) => (
            <li key={field}>
              <strong>{field}:</strong> {message}
            </li>
          ))}
        </ul>
        {onDismiss && (
          <button type="button" onClick={onDismiss}>
            Dismiss
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="action-result-banner action-result-banner--system" role="alert" aria-live="assertive">
      <p>{state.message}</p>
      {state.traceId && <p className="action-result-banner__trace">Trace ID: {state.traceId}</p>}
      <div className="action-result-banner__actions">
        {onRetry && (
          <button type="button" onClick={onRetry}>
            Retry
          </button>
        )}
        {onDismiss && (
          <button type="button" onClick={onDismiss}>
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
