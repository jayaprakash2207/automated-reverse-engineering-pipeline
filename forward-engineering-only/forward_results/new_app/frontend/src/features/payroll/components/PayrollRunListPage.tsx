import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePayrollRuns } from '../hooks/usePayrollRuns';
import { ProvisionalBanner } from '../../../shared/components/ProvisionalBanner';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { payrollRunStatusTone } from './payrollStatusTone';
import { CreatePayrollRunForm } from './CreatePayrollRunForm';
import './payroll.css';

function formatCurrency(amount: number | null): string {
  return amount != null ? amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) : '—';
}

export function PayrollRunListPage() {
  const { payrollRuns, isLoading, error, reload } = usePayrollRuns();
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <section className="payroll-page" aria-labelledby="payroll-runs-heading">
      <ProvisionalBanner moduleName="Payroll Run" />

      <div className="payroll-page__header">
        <h1 id="payroll-runs-heading">Payroll Runs</h1>
        <button type="button" onClick={() => setIsFormOpen((open) => !open)}>
          {isFormOpen ? 'Cancel' : 'New Payroll Run'}
        </button>
      </div>

      {isFormOpen && (
        <CreatePayrollRunForm
          onCreated={() => {
            setIsFormOpen(false);
            reload();
          }}
        />
      )}

      {isLoading && <p>Loading payroll runs…</p>}

      {error && (
        <div className="action-status action-status--system" role="alert">
          <p>Unable to load payroll runs. Please try again.</p>
          {error.traceId && <p className="action-status__trace">Trace ID: {error.traceId}</p>}
          <button type="button" onClick={reload}>
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <table className="payroll-table">
          <thead>
            <tr>
              <th>Run ID</th>
              <th>Pay Period</th>
              <th>Run Date</th>
              <th>Employees</th>
              <th>Total Net Pay</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payrollRuns.map((run) => (
              <tr key={run.id}>
                <td>
                  <Link to={`/payroll-runs/${run.id}`}>#{run.id}</Link>
                </td>
                <td>{run.payPeriodId}</td>
                <td>{run.runDate}</td>
                <td>{run.employeeCount ?? '—'}</td>
                <td>{formatCurrency(run.totalNetPay)}</td>
                <td>
                  <StatusBadge label={run.status} tone={payrollRunStatusTone(run.status)} />
                </td>
              </tr>
            ))}
            {payrollRuns.length === 0 && (
              <tr>
                <td colSpan={6}>No payroll runs found.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}
