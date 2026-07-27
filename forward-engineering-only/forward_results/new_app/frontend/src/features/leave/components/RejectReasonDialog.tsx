import { useState } from 'react';

// Minimum reason length is not specified in the UI/UX spec ("TBD by stakeholder").
// 10 characters is an interim default pending stakeholder confirmation.
const MIN_REASON_LENGTH = 10;

export interface RejectReasonDialogProps {
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
}

export function RejectReasonDialog({ submitting, onCancel, onSubmit }: RejectReasonDialogProps) {
  const [reason, setReason] = useState('');
  const tooShort = reason.trim().length < MIN_REASON_LENGTH;

  return (
    <div role="dialog" aria-modal="true" aria-label="Reject leave request" className="reject-dialog">
      <label htmlFor="reject-reason">Reason for rejection</label>
      <textarea
        id="reject-reason"
        value={reason}
        onChange={e => setReason(e.target.value)}
        rows={4}
        disabled={submitting}
      />
      <p className="reject-dialog-hint">
        {reason.trim().length}/{MIN_REASON_LENGTH} characters minimum
      </p>
      <div className="reject-dialog-actions">
        <button type="button" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="button" onClick={() => onSubmit(reason.trim())} disabled={tooShort || submitting}>
          {submitting ? 'Rejecting…' : 'Reject request'}
        </button>
      </div>
    </div>
  );
}
