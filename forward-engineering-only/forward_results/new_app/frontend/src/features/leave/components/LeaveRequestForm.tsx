import { useState, FormEvent } from 'react';
import type { CreateLeaveRequestRequest, LeaveRequestSubmittedResponse, LeaveType } from '../types/leaveRequest';
import type { ActionResult } from '../../../shared/types/actionResult';
import { ActionFeedback } from './ActionFeedback';

const LEAVE_TYPES: LeaveType[] = ['ANNUAL', 'SICK', 'UNPAID', 'BEREAVEMENT', 'PARENTAL', 'OTHER'];

export interface LeaveRequestFormProps {
  submitting: boolean;
  onSubmit: (req: CreateLeaveRequestRequest) => Promise<ActionResult<LeaveRequestSubmittedResponse>>;
}

export function LeaveRequestForm({ submitting, onSubmit }: LeaveRequestFormProps) {
  const [leaveType, setLeaveType] = useState<LeaveType>('ANNUAL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [clientError, setClientError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ActionResult<{ auditEntryId: string }> | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setClientError(null);

    if (!startDate || !endDate) {
      setClientError('Start and end dates are required.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setClientError('End date must be on or after the start date.');
      return;
    }

    const result = await onSubmit({ leaveType, startDate, endDate, reason });
    if (result.kind === 'success') {
      setFeedback({ kind: 'success', data: { auditEntryId: result.data.auditEntryId } });
      setStartDate('');
      setEndDate('');
      setReason('');
    } else {
      setFeedback(result);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-labelledby="new-leave-request-heading">
      <h2 id="new-leave-request-heading">Request leave</h2>

      {clientError && <p role="alert">{clientError}</p>}
      {feedback && (
        <ActionFeedback
          result={feedback}
          successMessage="Your leave request has been submitted."
          onDismiss={() => setFeedback(null)}
        />
      )}

      <label htmlFor="leave-type">Leave type</label>
      <select id="leave-type" value={leaveType} onChange={e => setLeaveType(e.target.value as LeaveType)}>
        {LEAVE_TYPES.map(type => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>

      <label htmlFor="start-date">Start date</label>
      <input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />

      <label htmlFor="end-date">End date</label>
      <input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />

      <label htmlFor="reason">Reason</label>
      <textarea id="reason" value={reason} onChange={e => setReason(e.target.value)} rows={3} />

      <button type="submit" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit request'}
      </button>
    </form>
  );
}
