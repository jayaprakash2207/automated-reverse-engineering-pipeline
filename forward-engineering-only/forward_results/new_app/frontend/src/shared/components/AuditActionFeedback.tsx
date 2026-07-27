import "./AuditActionFeedback.css";

export type AuditFeedbackStatus = "idle" | "pending" | "success" | "error";

export interface AuditActionFeedbackProps {
  status: AuditFeedbackStatus;
  auditEntryId?: string;
  traceId?: string;
  errorMessage?: string;
}

// Shared, cross-feature component for the fail-closed audit UX contract
// (UI/UX Spec §2 "Feedback" bullet, XLINK-003, NFR-R2/VG-04): any feature that
// performs a mutating, audited action (leave approval, employee lifecycle
// actions, etc.) renders this after the action completes so the user always
// sees either the recorded audit_entry_id or an explicit failure — never a
// silent success with no audit trace.
export function AuditActionFeedback({
  status,
  auditEntryId,
  traceId,
  errorMessage,
}: AuditActionFeedbackProps) {
  if (status === "idle") {
    return null;
  }

  if (status === "pending") {
    return (
      <div className="audit-feedback audit-feedback--pending" role="status">
        Recording audit entry…
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="audit-feedback audit-feedback--success" role="status">
        Action recorded. Audit entry: <strong>{auditEntryId ?? "unknown"}</strong>
      </div>
    );
  }

  return (
    <div className="audit-feedback audit-feedback--error" role="alert">
      <p>
        This action could not be confirmed because the audit entry failed to record.
        The request has not been completed and no state was changed.
      </p>
      {errorMessage && <p>{errorMessage}</p>}
      {traceId && (
        <p className="audit-feedback__trace">
          Trace ID: <code>{traceId}</code> — please retry, or share this ID with support if it persists.
        </p>
      )}
    </div>
  );
}
