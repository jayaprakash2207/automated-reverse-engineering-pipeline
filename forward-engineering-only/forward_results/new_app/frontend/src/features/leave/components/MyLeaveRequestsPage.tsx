import { useState } from 'react';
import { useMyLeaveRequests } from '../hooks/useMyLeaveRequests';
import { LeaveRequestForm } from './LeaveRequestForm';
import { LeaveStatusBadge } from './LeaveStatusBadge';
import { ActionFeedback } from './ActionFeedback';
import type { ActionResult } from '../../../shared/types/actionResult';

export function MyLeaveRequestsPage() {
  const { items, loading, error, submitting, submit, cancel } = useMyLeaveRequests();
  const [cancelFeedback, setCancelFeedback] = useState<ActionResult<{ auditEntryId: string }> | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  async function handleCancel(id: number) {
    setCancellingId(id);
    const result = await cancel(id);
    setCancellingId(null);
    if (result.kind === 'success') {
      setCancelFeedback({ kind: 'success', data: { auditEntryId: result.data.auditEntryId } });
    } else {
      setCancelFeedback(result);
    }
  }

  return (
    <section aria-labelledby="my-leave-heading">
      <LeaveRequestForm submitting={submitting} onSubmit={submit} />

      <h1 id="my-leave-heading">My leave requests</h1>

      {cancelFeedback && (
        <ActionFeedback
          result={cancelFeedback}
          successMessage="Your leave request has been cancelled."
          onDismiss={() => setCancelFeedback(null)}
        />
      )}

      {loading && <p>Loading your leave requests…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && items.length === 0 && <p>You have not submitted any leave requests yet.</p>}

      {!loading && items.length > 0 && (
        <ul className="my-leave-requests-list">
          {items.map(item => (
            <li key={item.id}>
              <span>{item.leaveType}</span>{' '}
              <span>
                {item.startDate} – {item.endDate}
              </span>{' '}
              <span>{item.daysRequested} day(s)</span> <LeaveStatusBadge status={item.status} />
              {item.status === 'PENDING' && (
                <button type="button" onClick={() => handleCancel(item.id)} disabled={cancellingId === item.id}>
                  {cancellingId === item.id ? 'Cancelling…' : 'Cancel'}
                </button>
              )}
              {item.status === 'REJECTED' && item.rejectionReason && (
                <p className="rejection-reason">Reason: {item.rejectionReason}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
