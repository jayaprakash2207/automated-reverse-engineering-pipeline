import { ReactNode } from 'react';
import { AsyncOutcome } from '../../../shared/hooks/useAsyncOutcome';

/**
 * Renders the three-state UX contract from UI/UX Spec (Document 20) §3:
 * success (caller supplies the view, since the resulting history entry it
 * must surface differs per action), validation failure (specific field-level
 * messages), or system failure (generic message + trace id — never a raw
 * error code).
 */
interface ActionResultBannerProps<R> {
  outcome: AsyncOutcome<R>;
  renderSuccess: (result: R) => ReactNode;
}

export function ActionResultBanner<R>({ outcome, renderSuccess }: ActionResultBannerProps<R>) {
  if (outcome.kind === 'idle' || outcome.kind === 'submitting') {
    return null;
  }

  if (outcome.kind === 'success') {
    return (
      <div role="status" className="action-banner action-banner--success">
        {renderSuccess(outcome.result)}
      </div>
    );
  }

  if (outcome.kind === 'validation_failure') {
    const { error } = outcome;
    return (
      <div role="alert" className="action-banner action-banner--validation">
        <p>{error.message}</p>
        {error.fieldErrors.length > 0 && (
          <ul>
            {error.fieldErrors.map((fieldError) => (
              <li key={fieldError.field}>
                <strong>{fieldError.field}:</strong> {fieldError.message}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const { error } = outcome;
  return (
    <div role="alert" className="action-banner action-banner--system">
      <p>Something went wrong on our end. Please try again.</p>
      <p className="action-banner__trace">Reference ID: {error.traceId}</p>
    </div>
  );
}
