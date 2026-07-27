import React from 'react';
import { ActionOutcome } from '../types/actionOutcome';
import './ActionFeedback.css';

interface ActionFeedbackProps<TResult> {
  outcome: ActionOutcome<TResult>;
  pendingLabel?: string;
  successLabel?: string;
  onRetry?: () => void;
}

export function ActionFeedback<TResult>({
  outcome,
  pendingLabel = 'Processing...',
  successLabel = 'Action recorded.',
  onRetry,
}: ActionFeedbackProps<TResult>): JSX.Element | null {
  switch (outcome.status) {
    case 'idle':
      return null;

    case 'pending':
      return (
        <div className="action-feedback action-feedback--pending" role="status">
          {pendingLabel}
        </div>
      );

    case 'success':
      return (
        <div className="action-feedback action-feedback--success" role="status">
          <span>{successLabel}</span>
          <span className="action-feedback__audit-id">Audit entry: {outcome.auditEntryId}</span>
        </div>
      );

    case 'validationError':
      return (
        <div className="action-feedback action-feedback--validation" role="alert">
          <p>Please correct the following:</p>
          <ul>
            {Object.entries(outcome.fieldErrors).map(([field, message]) => (
              <li key={field}>{message}</li>
            ))}
          </ul>
        </div>
      );

    case 'systemError':
      return (
        <div className="action-feedback action-feedback--system-error" role="alert">
          <p>{outcome.message || 'Something went wrong. Please try again.'}</p>
          {outcome.traceId && <p className="action-feedback__trace-id">Trace ID: {outcome.traceId}</p>}
          {onRetry && (
            <button type="button" onClick={onRetry}>
              Retry
            </button>
          )}
        </div>
      );

    default:
      return null;
  }
}
