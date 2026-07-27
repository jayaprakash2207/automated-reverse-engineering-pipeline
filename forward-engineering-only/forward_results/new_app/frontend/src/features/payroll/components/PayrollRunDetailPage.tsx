import { useParams } from 'react-router-dom';
import { usePayrollRunDetail } from '../hooks/usePayrollRunDetail';
import { ProvisionalBanner } from '../../../shared/components/ProvisionalBanner';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { payrollRunStatusTone } from './payrollStatusTone';
import './payroll.css';

function formatCurrency(amount: number | null): string {
  return amount != null ? amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) : '—';
}

export function PayrollRunDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  const { payrollRun, isLoading, error, reload } = usePayrollRunDetail(Number(runId));

  return (
    <section className="payroll-page" aria-labelledby="payroll-run-detail-heading">
      <ProvisionalBanner moduleName="Payroll Run" />
      <h1 id="payroll-run-detail-heading">Payroll Run Detail</h1>

      {isLoading && <p>Loading payroll run…</p>}

      {error?.kind === 'notFound' && <p role="alert">No payroll run found for this ID.</p>}

      {error && error.kind !== 'notFound' && (
        <div className="action-status action-status--system" role="alert">
          <p>Unable to load this payroll run. Please try again.</p>
          {error.traceId && <p className="action-status__trace">Trace ID: {error.traceId}</p>}
          <button type="button" onClick={reload}>
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && payrollRun && (
        <dl className="payroll-detail">
          <dt>Run ID</dt>
          <dd>#{payrollRun.id}</dd>
          <dt>Pay Period</dt>
          <dd>{payrollRun.payPeriodId}</dd>
          <dt>Run Date</dt>
          <dd>{payrollRun.runDate}</dd>
          <dt>Status</dt>
          <dd>
            <StatusBadge label={payrollRun.status} tone={payrollRunStatusTone(payrollRun.status)} />
          </dd>
          <dt>Employees Processed</dt>
          <dd>{payrollRun.employeeCount ?? '—'}</dd>
          <dt>Total Gross Pay</dt>
          <dd>{formatCurrency(payrollRun.totalGrossPay)}</dd>
          <dt>Total Net Pay</dt>
          <dd>{formatCurrency(payrollRun.totalNetPay)}</dd>
        </dl>
      )}
    </section>
  );
}
