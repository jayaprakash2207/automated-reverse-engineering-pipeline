// Encodes the exact three post-action states required by UI/UX Doc 20 §3
// (success / validation failure / system failure — never a raw error code or
// blank screen), plus the audit-entry surfacing required by §2.
export type ActionOutcome =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'success'; message: string; auditEntryId: string }
  | { status: 'validationError'; fieldErrors: Record<string, string> }
  | { status: 'systemError'; message: string; traceId?: string };

interface ActionResultBannerProps {
  outcome: ActionOutcome;
}

export function ActionResultBanner({ outcome }: ActionResultBannerProps) {
  if (outcome.status === 'idle') {
    return null;
  }

  if (outcome.status === 'pending') {
    return (
      <div role="status" className="action-banner action-banner--pending">
        Processing...
      </div>
    );
  }

  if (outcome.status === 'success') {
    return (
      <div role="status" className="action-banner action-banner--success">
        <p>{outcome.message}</p>
        <p className="action-banner__audit-id">Audit entry recorded: {outcome.auditEntryId}</p>
      </div>
    );
  }

  if (outcome.status === 'validationError') {
    return (
      <div role="alert" className="action-banner action-banner--validation">
        <p>Please correct the following:</p>
        <ul>
          {Object.entries(outcome.fieldErrors).map(([field, message]) => (
            <li key={field}>
              {field}: {message}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div role="alert" className="action-banner action-banner--system-error">
      <p>{outcome.message}</p>
      {outcome.traceId && <p className="action-banner__trace-id">Reference ID: {outcome.traceId}</p>}
    </div>
  );
}
