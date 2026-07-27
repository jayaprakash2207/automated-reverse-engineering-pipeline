import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useEmployee } from '../hooks/useEmployee';
import { useEmployeeHistory } from '../hooks/useEmployeeHistory';
import { EmployeeHistoryTimeline } from './EmployeeHistoryTimeline';
import { EmployeeLifecycleActionModal } from './EmployeeLifecycleActionModal';
import { StatusBadge } from './StatusBadge';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import type { ChangeType } from '../types/employee';

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const employeeId = Number(id);
  const { employee, loading, error, refetch } = useEmployee(employeeId);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const { history, loading: historyLoading } = useEmployeeHistory(employeeId, historyRefreshKey);
  const [activeAction, setActiveAction] = useState<ChangeType | null>(null);

  if (loading) return <LoadingSpinner label="Loading employee…" />;

  if (error || !employee) {
    return (
      <div role="alert" className="action-banner action-banner--system">
        <p>{error ?? 'Employee not found.'}</p>
        <button type="button" onClick={refetch}>
          Retry
        </button>
      </div>
    );
  }

  function handleApplied() {
    refetch();
    setHistoryRefreshKey((key) => key + 1);
  }

  return (
    <section aria-labelledby="employee-detail-heading">
      <h1 id="employee-detail-heading">
        {employee.firstName} {employee.lastName}
      </h1>
      <dl className="employee-profile">
        <div>
          <dt>Employee #</dt>
          <dd>{employee.employeeNumber}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{employee.email}</dd>
        </div>
        <div>
          <dt>Department</dt>
          <dd>{employee.department}</dd>
        </div>
        <div>
          <dt>Job Title</dt>
          <dd>{employee.jobTitle}</dd>
        </div>
        <div>
          <dt>Hire Date</dt>
          <dd>{employee.hireDate}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <StatusBadge status={employee.status} />
          </dd>
        </div>
        <div>
          <dt>SSN</dt>
          <dd>•••-••-{employee.ssnLastFour}</dd>
        </div>
      </dl>

      <div className="employee-actions" role="group" aria-label="Employee lifecycle actions">
        <button type="button" onClick={() => setActiveAction('TRANSFER')} disabled={employee.status === 'TERMINATED'}>
          Transfer
        </button>
        <button type="button" onClick={() => setActiveAction('PROMOTION')} disabled={employee.status === 'TERMINATED'}>
          Promote
        </button>
        {employee.status === 'TERMINATED' ? (
          <button type="button" onClick={() => setActiveAction('REHIRE')}>
            Rehire
          </button>
        ) : (
          <button type="button" onClick={() => setActiveAction('TERMINATION')}>
            Terminate
          </button>
        )}
      </div>

      <h2>History</h2>
      {historyLoading ? <LoadingSpinner label="Loading history…" /> : <EmployeeHistoryTimeline history={history} />}

      {activeAction && (
        <EmployeeLifecycleActionModal
          employee={employee}
          changeType={activeAction}
          onClose={() => setActiveAction(null)}
          onApplied={handleApplied}
        />
      )}
    </section>
  );
}
