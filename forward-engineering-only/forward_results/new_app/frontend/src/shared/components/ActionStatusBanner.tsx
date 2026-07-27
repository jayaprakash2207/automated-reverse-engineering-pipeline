import './ActionStatusBanner.css';

export type ActionStatus =
  | { kind: 'idle' }
  | { kind: 'success'; message: string }
  | { kind: 'validation'; message: string; fieldErrors?: Record<string, string> }
  | { kind: 'system'; message: string; traceId?: string };

interface ActionStatusBannerProps {
  status: ActionStatus;
  onRetry?: () => void;
}

// Document 20 §3: every mutating action must resolve to exactly one of success,
// validation failure, or system failure — never a raw error code or a blank/frozen screen.
export function ActionStatusBanner({ status, onRetry }: ActionStatusBannerProps) {
  if (status.kind === 'idle') {
    return null;
  }

  if (status.kind === 'success') {
    return (
      <div className="action-status action-status--success" role="status">
        {status.message}
      </div>
    );
  }

  if (status.kind === 'validation') {
    return (
      <div className="action-status action-status--validation" role="alert">
        <p>{status.message}</p>
        {status.fieldErrors && (
          <ul>
            {Object.entries(status.fieldErrors).map(([field, message]) => (
              <li key={field}>
                {field}: {message}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="action-status action-status--system" role="alert">
      <p>{status.message}</p>
      {status.traceId && <p className="action-status__trace">Trace ID: {status.traceId}</p>}
      <button type="button" onClick={() => onRetry?.()}>
        Retry
      </button>
    </div>
  );
}
