import { useParams } from 'react-router-dom';
import { useEmployee } from '../hooks/useEmployee';
import { useEmployeeHistory } from '../hooks/useEmployeeHistory';
import { EmployeeStatusBadge } from './EmployeeStatusBadge';
import { EmployeeHistoryTimeline } from './EmployeeHistoryTimeline';
import { LifecycleActionPanel } from './LifecycleActionPanel';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { ErrorState } from '../../../shared/components/ErrorState';

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const employeeId = Number(id);
  const { employee, loading, error, reload } = useEmployee(employeeId);
  const {
    history,
    loading: historyLoading,
    error: historyError,
    reload: reloadHistory,
  } = useEmployeeHistory(employeeId);

  if (loading) return <LoadingSpinner label="Loading employee" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!employee) return null;

  function handleChanged() {
    reload();
    reloadHistory();
  }

  return (
    <main>
      <h1>
        {employee.first_name} {employee.last_name}
      </h1>
      <EmployeeStatusBadge status={employee.status} />
      <dl className="employee-profile">
        <dt>Employee #</dt>
        <dd>{employee.employee_number}</dd>
        <dt>Email</dt>
        <dd>{employee.email}</dd>
        <dt>Job title</dt>
        <dd>{employee.job_title}</dd>
        <dt>Department</dt>
        <dd>{employee.department}</dd>
        <dt>Hire date</dt>
        <dd>{employee.hire_date}</dd>
      </dl>

      <LifecycleActionPanel employee={employee} onChanged={handleChanged} />

      <h2>History</h2>
      {historyLoading && <LoadingSpinner label="Loading history" />}
      {historyError && <ErrorState error={historyError} onRetry={reloadHistory} />}
      {!historyLoading && !historyError && <EmployeeHistoryTimeline history={history} />}
    </main>
  );
}
