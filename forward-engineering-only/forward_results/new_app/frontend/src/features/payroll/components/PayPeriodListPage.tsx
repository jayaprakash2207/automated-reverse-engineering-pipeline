import { usePayPeriods } from '../hooks/usePayPeriods';
import { ProvisionalBanner } from '../../../shared/components/ProvisionalBanner';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { payPeriodStatusTone } from './payrollStatusTone';
import './payroll.css';

export function PayPeriodListPage() {
  const { payPeriods, isLoading, error, reload } = usePayPeriods();

  return (
    <section className="payroll-page" aria-labelledby="pay-periods-heading">
      <ProvisionalBanner moduleName="Pay Period" />
      <h1 id="pay-periods-heading">Pay Periods</h1>

      {isLoading && <p>Loading pay periods…</p>}

      {error && (
        <div className="action-status action-status--system" role="alert">
          <p>Unable to load pay periods. Please try again.</p>
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
              <th>Start Date</th>
              <th>End Date</th>
              <th>Pay Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payPeriods.map((period) => (
              <tr key={period.id}>
                <td>{period.startDate}</td>
                <td>{period.endDate}</td>
                <td>{period.payDate}</td>
                <td>
                  <StatusBadge label={period.status} tone={payPeriodStatusTone(period.status)} />
                </td>
              </tr>
            ))}
            {payPeriods.length === 0 && (
              <tr>
                <td colSpan={4}>No pay periods found.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}
