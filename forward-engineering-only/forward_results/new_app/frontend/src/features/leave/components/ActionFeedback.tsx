import type { ActionResult } from '../../../shared/types/actionResult';

export interface ActionFeedbackProps {
  result: ActionResult<{ auditEntryId: string }>;
  successMessage: string;
  onDismiss: () => void;
}

export function ActionFeedback({ result, successMessage, onDismiss }: ActionFeedbackProps) {
  if (result.kind === 'success') {
    return (
      <div role="status" className="feedback feedback-success">
        <p>{successMessage}</p>
        <p>
          Audit entry recorded: <code data-testid="audit-entry-id">{result.data.auditEntryId}</code>
        </p>
        <button type="button" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    );
  }

  if (result.kind === 'validation_error') {
    return (
      <div role="alert" className="feedback feedback-validation">
        <p>{result.message}</p>
        <button type="button" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div role="alert" className="feedback feedback-system-error">
      <p>Something went wrong and your request could not be completed. Please try again.</p>
      {result.traceId && (
        <p>
          Reference: <code data-testid="error-trace-id">{result.traceId}</code>
        </p>
      )}
      <button type="button" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}
