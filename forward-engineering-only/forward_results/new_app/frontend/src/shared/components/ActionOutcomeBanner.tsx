import { ActionOutcome } from '../types/actionResult';

interface ActionOutcomeBannerProps<T> {
  outcome: ActionOutcome<T> | null;
}

// Renders exactly the three user-facing states required by UI/UX Spec §3
// (success / validation failure / system failure) — never a raw error code
// or a blank/frozen screen. Success always surfaces the audit_entry_id
// (UI/UX Spec §2), so a mutating action can never appear to have "worked"
// without a visible audit trace.
export function ActionOutcomeBanner<T>({ outcome }: ActionOutcomeBannerProps<T>) {
  if (!outcome) {
    return null;
  }

  if (outcome.status === 'success') {
    return (
      <div role="status" className="action-outcome action-outcome--success">
        <p>Action completed successfully.</p>
        <p>
          Audit entry recorded: <strong>{outcome.auditEntryId}</strong>
        </p>
      </div>
    );
  }

  if (outcome.status === 'validationFailure') {
    const fields = Object.entries(outcome.fieldErrors);
    return (
      <div role="alert" className="action-outcome action-outcome--validation">
        <p>Please correct the following:</p>
        <ul>
          {fields.map(([field, message]) => (
            <li key={field}>
              {field}: {message}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div role="alert" className="action-outcome action-outcome--system-failure">
      <p>{outcome.message ?? 'Something went wrong. Please retry.'}</p>
      {outcome.traceId ? <p>Trace ID: {outcome.traceId}</p> : null}
    </div>
  );
}
