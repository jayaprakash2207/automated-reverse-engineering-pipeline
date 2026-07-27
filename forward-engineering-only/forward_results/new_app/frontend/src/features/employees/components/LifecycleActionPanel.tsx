import { FormEvent, useRef, useState } from 'react';
import { employeeApi } from '../api/employeeApi';
import { useLifecycleAction } from '../hooks/useLifecycleAction';
import { ActionResultBanner } from './ActionResultBanner';
import {
  EmployeeDto,
  PromoteRequest,
  RehireRequest,
  TerminateRequest,
  TransferRequest,
  UpdateEmployeeResponse,
} from '../types/employee';

/**
 * Implements UI/UX Spec (Document 20) §3: transfer/promote/terminate/rehire
 * each show exactly one of success / validation failure / system failure —
 * never a raw error code or a blank/frozen screen (the source system's
 * TD-11/TD-12 unhandled-database-error experience this replaces). The
 * dialog only closes on explicit Cancel or after a confirmed success, so a
 * system failure never gets mistaken for a completed change.
 */
interface LifecycleActionPanelProps {
  employee: EmployeeDto;
  onChanged: (response: UpdateEmployeeResponse) => void;
}

type ActionKind = 'transfer' | 'promote' | 'terminate' | 'rehire';

function renderHistorySuccess(result: UpdateEmployeeResponse) {
  return (
    <>
      Change recorded (history entry #{result.history_entry.id}, effective{' '}
      {result.history_entry.effective_date}).
    </>
  );
}

export function LifecycleActionPanel({ employee, onChanged }: LifecycleActionPanelProps) {
  const [openAction, setOpenAction] = useState<ActionKind | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  function openDialog(action: ActionKind) {
    setOpenAction(action);
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
    setOpenAction(null);
  }

  const canManage = employee.status !== 'TERMINATED';

  return (
    <section aria-label="Lifecycle actions">
      <h2>Actions</h2>
      <div className="lifecycle-actions">
        {canManage && (
          <>
            <button type="button" onClick={() => openDialog('transfer')}>
              Transfer
            </button>
            <button type="button" onClick={() => openDialog('promote')}>
              Promote
            </button>
            <button type="button" onClick={() => openDialog('terminate')}>
              Terminate
            </button>
          </>
        )}
        {!canManage && (
          <button type="button" onClick={() => openDialog('rehire')}>
            Rehire
          </button>
        )}
      </div>

      <dialog ref={dialogRef} aria-label="Lifecycle action">
        {openAction === 'transfer' && (
          <TransferDialogBody employee={employee} onDone={onChanged} onClose={closeDialog} />
        )}
        {openAction === 'promote' && (
          <PromoteDialogBody employee={employee} onDone={onChanged} onClose={closeDialog} />
        )}
        {openAction === 'terminate' && (
          <TerminateDialogBody employee={employee} onDone={onChanged} onClose={closeDialog} />
        )}
        {openAction === 'rehire' && (
          <RehireDialogBody employee={employee} onDone={onChanged} onClose={closeDialog} />
        )}
      </dialog>
    </section>
  );
}

interface DialogBodyProps {
  employee: EmployeeDto;
  onDone: (response: UpdateEmployeeResponse) => void;
  onClose: () => void;
}

function TransferDialogBody({ employee, onDone, onClose }: DialogBodyProps) {
  const { outcome, run, reset } = useLifecycleAction<TransferRequest>((payload) =>
    employeeApi.transfer(employee.id, payload),
  );
  const [department, setDepartment] = useState(employee.department);
  const [effectiveDate, setEffectiveDate] = useState('');
  const [reason, setReason] = useState('');
  const isSuccess = outcome.kind === 'success';

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    run({ new_department: department, effective_date: effectiveDate, reason: reason || undefined });
  }

  return (
    <div>
      <h3>
        Transfer {employee.first_name} {employee.last_name}
      </h3>
      {!isSuccess && (
        <form onSubmit={handleSubmit}>
          <label>
            New department
            <input
              type="text"
              required
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
            />
          </label>
          <label>
            Effective date
            <input
              type="date"
              required
              value={effectiveDate}
              onChange={(event) => setEffectiveDate(event.target.value)}
            />
          </label>
          <label>
            Reason
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
          <ActionResultBanner outcome={outcome} renderSuccess={() => null} />
          <div className="dialog-actions">
            <button type="submit" disabled={outcome.kind === 'submitting'}>
              Submit
            </button>
            <button
              type="button"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {isSuccess && (
        <>
          <ActionResultBanner outcome={outcome} renderSuccess={renderHistorySuccess} />
          <button
            type="button"
            onClick={() => {
              onDone(outcome.result);
              onClose();
            }}
          >
            Close
          </button>
        </>
      )}
    </div>
  );
}

function PromoteDialogBody({ employee, onDone, onClose }: DialogBodyProps) {
  const { outcome, run, reset } = useLifecycleAction<PromoteRequest>((payload) =>
    employeeApi.promote(employee.id, payload),
  );
  const [jobTitle, setJobTitle] = useState(employee.job_title);
  const [effectiveDate, setEffectiveDate] = useState('');
  const [reason, setReason] = useState('');
  const isSuccess = outcome.kind === 'success';

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    run({ new_job_title: jobTitle, effective_date: effectiveDate, reason: reason || undefined });
  }

  return (
    <div>
      <h3>
        Promote {employee.first_name} {employee.last_name}
      </h3>
      {!isSuccess && (
        <form onSubmit={handleSubmit}>
          <label>
            New job title
            <input
              type="text"
              required
              value={jobTitle}
              onChange={(event) => setJobTitle(event.target.value)}
            />
          </label>
          <label>
            Effective date
            <input
              type="date"
              required
              value={effectiveDate}
              onChange={(event) => setEffectiveDate(event.target.value)}
            />
          </label>
          <label>
            Reason
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
          <ActionResultBanner outcome={outcome} renderSuccess={() => null} />
          <div className="dialog-actions">
            <button type="submit" disabled={outcome.kind === 'submitting'}>
              Submit
            </button>
            <button
              type="button"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {isSuccess && (
        <>
          <ActionResultBanner outcome={outcome} renderSuccess={renderHistorySuccess} />
          <button
            type="button"
            onClick={() => {
              onDone(outcome.result);
              onClose();
            }}
          >
            Close
          </button>
        </>
      )}
    </div>
  );
}

function TerminateDialogBody({ employee, onDone, onClose }: DialogBodyProps) {
  const { outcome, run, reset } = useLifecycleAction<TerminateRequest>((payload) =>
    employeeApi.terminate(employee.id, payload),
  );
  const [effectiveDate, setEffectiveDate] = useState('');
  const [reason, setReason] = useState('');
  const isSuccess = outcome.kind === 'success';

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    run({ effective_date: effectiveDate, reason });
  }

  return (
    <div>
      <h3>
        Terminate {employee.first_name} {employee.last_name}
      </h3>
      {!isSuccess && (
        <form onSubmit={handleSubmit}>
          <label>
            Effective date
            <input
              type="date"
              required
              value={effectiveDate}
              onChange={(event) => setEffectiveDate(event.target.value)}
            />
          </label>
          <label>
            Reason (required)
            <textarea required value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
          <ActionResultBanner outcome={outcome} renderSuccess={() => null} />
          <div className="dialog-actions">
            <button type="submit" disabled={outcome.kind === 'submitting'}>
              Confirm termination
            </button>
            <button
              type="button"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {isSuccess && (
        <>
          <ActionResultBanner outcome={outcome} renderSuccess={renderHistorySuccess} />
          <button
            type="button"
            onClick={() => {
              onDone(outcome.result);
              onClose();
            }}
          >
            Close
          </button>
        </>
      )}
    </div>
  );
}

function RehireDialogBody({ employee, onDone, onClose }: DialogBodyProps) {
  const { outcome, run, reset } = useLifecycleAction<RehireRequest>((payload) =>
    employeeApi.rehire(employee.id, payload),
  );
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [reason, setReason] = useState('');
  const isSuccess = outcome.kind === 'success';

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    run({ job_title: jobTitle, department, effective_date: effectiveDate, reason: reason || undefined });
  }

  return (
    <div>
      <h3>
        Rehire {employee.first_name} {employee.last_name}
      </h3>
      {!isSuccess && (
        <form onSubmit={handleSubmit}>
          <label>
            Job title
            <input
              type="text"
              required
              value={jobTitle}
              onChange={(event) => setJobTitle(event.target.value)}
            />
          </label>
          <label>
            Department
            <input
              type="text"
              required
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
            />
          </label>
          <label>
            Effective date
            <input
              type="date"
              required
              value={effectiveDate}
              onChange={(event) => setEffectiveDate(event.target.value)}
            />
          </label>
          <label>
            Reason
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
          <ActionResultBanner outcome={outcome} renderSuccess={() => null} />
          <div className="dialog-actions">
            <button type="submit" disabled={outcome.kind === 'submitting'}>
              Submit
            </button>
            <button
              type="button"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {isSuccess && (
        <>
          <ActionResultBanner outcome={outcome} renderSuccess={renderHistorySuccess} />
          <button
            type="button"
            onClick={() => {
              onDone(outcome.result);
              onClose();
            }}
          >
            Close
          </button>
        </>
      )}
    </div>
  );
}
