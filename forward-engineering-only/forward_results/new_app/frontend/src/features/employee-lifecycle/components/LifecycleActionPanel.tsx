import { FormEvent, useState } from 'react';
import { useEmployeeLifecycleAction } from '../hooks/useEmployeeLifecycleAction';
import { ActionResultBanner } from '../../../shared/components/ActionResultBanner';
import { LifecycleActionType } from '../types/lifecycleAction';

interface LifecycleActionPanelProps {
  employeeId: string;
}

const ACTION_TYPES: LifecycleActionType[] = ['TRANSFER', 'PROMOTE', 'TERMINATE', 'REHIRE'];

// UI/UX Spec §3: transfer/promote/terminate/rehire must resolve to exactly one of
// success / validation failure / system failure — never a raw error or frozen screen,
// which is what an unhandled ORA-00904/ORA-02290 produces in the source system today.
export function LifecycleActionPanel({ employeeId }: LifecycleActionPanelProps) {
  const [actionType, setActionType] = useState<LifecycleActionType>('TRANSFER');
  const [effectiveDate, setEffectiveDate] = useState('');
  const { state, run, reset } = useEmployeeLifecycleAction();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    run({ employeeId, actionType, effectiveDate });
  }

  return (
    <section aria-label="Employee lifecycle action">
      <h1>Employee Lifecycle Action</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="actionType">Action</label>
        <select id="actionType" value={actionType} onChange={(e) => setActionType(e.target.value as LifecycleActionType)}>
          {ACTION_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <label htmlFor="effectiveDate">Effective date</label>
        <input
          id="effectiveDate"
          type="date"
          value={effectiveDate}
          onChange={(e) => setEffectiveDate(e.target.value)}
          required
        />

        <button type="submit" disabled={state.phase === 'running'}>
          Submit
        </button>
      </form>

      {state.phase === 'running' && <p role="status">Processing {actionType.toLowerCase()}…</p>}
      {state.phase === 'done' && <ActionResultBanner outcome={state.outcome} onDismiss={reset} />}
    </section>
  );
}
