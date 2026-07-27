import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useEmployeeLifecycleAction } from '../hooks/useEmployeeLifecycleAction';
import { ActionResultBanner } from '../../../shared/components/ActionResultBanner';
import type { ChangeType, Employee } from '../types/employee';

interface EmployeeLifecycleActionModalProps {
  employee: Employee;
  changeType: ChangeType;
  onClose: () => void;
  onApplied: () => void;
}

const TITLES: Record<ChangeType, string> = {
  HIRE: 'Hire Employee',
  TRANSFER: 'Transfer Employee',
  PROMOTION: 'Promote Employee',
  TERMINATION: 'Terminate Employee',
  REHIRE: 'Rehire Employee',
};

// Implements Doc 20 §3: transfer/promote/terminate/rehire must resolve to
// exactly success / validation failure / system failure, and a system failure
// must never leave the record silently changed or the screen frozen — the
// form stays open and interactive, and the pending action can be retried.
export function EmployeeLifecycleActionModal({
  employee,
  changeType,
  onClose,
  onApplied,
}: EmployeeLifecycleActionModalProps) {
  const { state, execute, reset } = useEmployeeLifecycleAction(employee.id);
  const [department, setDepartment] = useState(employee.department);
  const [jobTitle, setJobTitle] = useState(employee.jobTitle);
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  useEffect(() => {
    if (state.status === 'success') {
      onApplied();
    }
  }, [state, onApplied]);

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      onClose();
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await execute({
      changeType,
      department: changeType === 'TRANSFER' ? department : undefined,
      jobTitle: changeType === 'PROMOTION' ? jobTitle : undefined,
      effectiveDate,
      reason: changeType === 'TERMINATION' ? reason : reason || undefined,
    });
  }

  const requiresReason = changeType === 'TERMINATION';
  const isSubmitting = state.status === 'submitting';
  const isDone = state.status === 'success';

  return (
    <div className="modal-overlay" onKeyDown={handleKeyDown}>
      <div role="dialog" aria-modal="true" aria-labelledby="lifecycle-modal-title" className="modal">
        <h2 id="lifecycle-modal-title">{TITLES[changeType]}</h2>
        <p>
          {employee.firstName} {employee.lastName} · {employee.employeeNumber}
        </p>

        <form onSubmit={handleSubmit}>
          {changeType === 'TRANSFER' && (
            <div>
              <label htmlFor="lifecycle-department">New department</label>
              <input
                id="lifecycle-department"
                ref={firstFieldRef}
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
                disabled={isSubmitting || isDone}
              />
            </div>
          )}

          {changeType === 'PROMOTION' && (
            <div>
              <label htmlFor="lifecycle-job-title">New job title</label>
              <input
                id="lifecycle-job-title"
                ref={firstFieldRef}
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                required
                disabled={isSubmitting || isDone}
              />
            </div>
          )}

          <div>
            <label htmlFor="lifecycle-effective-date">Effective date</label>
            <input
              id="lifecycle-effective-date"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              required
              disabled={isSubmitting || isDone}
            />
          </div>

          <div>
            <label htmlFor="lifecycle-reason">
              Reason{requiresReason ? '' : ' (optional)'}
            </label>
            <textarea
              id="lifecycle-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required={requiresReason}
              disabled={isSubmitting || isDone}
            />
          </div>

          <ActionResultBanner
            state={state}
            onRetry={reset}
            renderSuccess={(data) => (
              <>
                <p>{TITLES[changeType]} recorded.</p>
                <p>
                  Audit entry: <code>{data.auditEntryId}</code>
                </p>
              </>
            )}
          />

          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              {isDone ? 'Close' : 'Cancel'}
            </button>
            {!isDone && (
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting…' : 'Confirm'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
