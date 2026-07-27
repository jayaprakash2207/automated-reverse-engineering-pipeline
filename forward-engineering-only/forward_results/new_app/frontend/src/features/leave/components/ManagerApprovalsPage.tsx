import { useState } from 'react';
import { usePendingApprovals } from '../hooks/usePendingApprovals';
import { useLeaveRequestActions } from '../hooks/useLeaveRequestActions';
import { ApprovalRow } from './ApprovalRow';
import { ActionFeedback } from './ActionFeedback';
import type { ActionResult } from '../../../shared/types/actionResult';

interface Feedback {
  result: ActionResult<{ auditEntryId: string }>;
  successMessage: string;
}

export function ManagerApprovalsPage() {
  const { items, loading, error, refetch } = usePendingApprovals();
  const { approve, reject, isBusy } = useLeaveRequestActions();
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function handleApprove(id: number) {
    const result = await approve(id);
    if (result.kind === 'success') {
      setFeedback({
        result: { kind: 'success', data: { auditEntryId: result.data.auditEntryId } },
        successMessage: 'Leave request approved.',
      });
      await refetch();
    } else {
      setFeedback({ result, successMessage: '' });
    }
  }

  async function handleReject(id: number, reason: string) {
    const result = await reject(id, reason);
    if (result.kind === 'success') {
      setFeedback({
        result: { kind: 'success', data: { auditEntryId: result.data.auditEntryId } },
        successMessage: 'Leave request rejected.',
      });
      await refetch();
    } else {
      setFeedback({ result, successMessage: '' });
    }
  }

  return (
    <section aria-labelledby="approvals-heading">
      <h1 id="approvals-heading">Pending Approvals</h1>

      {feedback && (
        <ActionFeedback
          result={feedback.result}
          successMessage={feedback.successMessage}
          onDismiss={() => setFeedback(null)}
        />
      )}

      {loading && <p>Loading pending approvals…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && items.length === 0 && <p>No leave requests are waiting on your approval.</p>}

      {!loading && items.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Leave type</th>
              <th>Dates</th>
              <th>Days</th>
              <th>Balance after request</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <ApprovalRow
                key={item.id}
                request={item}
                busy={isBusy(item.id)}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
