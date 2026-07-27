import { FormEvent, useState } from 'react';
import { usePayPeriods } from '../hooks/usePayPeriods';
import { useCreatePayrollRun } from '../hooks/useCreatePayrollRun';
import { ActionStatusBanner } from '../../../shared/components/ActionStatusBanner';
import { PayrollRun } from '../types/payrollRun';

interface CreatePayrollRunFormProps {
  onCreated?: (run: PayrollRun) => void;
}

export function CreatePayrollRunForm({ onCreated }: CreatePayrollRunFormProps) {
  const { payPeriods, isLoading: isLoadingPayPeriods } = usePayPeriods();
  const { status, isSubmitting, createRun, reset } = useCreatePayrollRun();
  const [selectedPayPeriodId, setSelectedPayPeriodId] = useState('');

  // Only closed pay periods are eligible for a payroll run — an open period's
  // totals aren't final yet, per LeaveBalanceService-style resolved-formula rule.
  const eligiblePayPeriods = payPeriods.filter((period) => period.status === 'CLOSED');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPayPeriodId) return;

    const run = await createRun({ payPeriodId: Number(selectedPayPeriodId) });
    if (run) {
      setSelectedPayPeriodId('');
      onCreated?.(run);
    }
  };

  return (
    <form className="payroll-form" onSubmit={handleSubmit}>
      <h2>Start a Payroll Run</h2>

      <label htmlFor="pay-period-select">Pay Period</label>
      <select
        id="pay-period-select"
        value={selectedPayPeriodId}
        onChange={(event) => {
          setSelectedPayPeriodId(event.target.value);
          reset();
        }}
        disabled={isLoadingPayPeriods || isSubmitting}
        required
      >
        <option value="" disabled>
          Select a closed pay period
        </option>
        {eligiblePayPeriods.map((period) => (
          <option key={period.id} value={period.id}>
            {period.startDate} – {period.endDate}
          </option>
        ))}
      </select>

      <button type="submit" disabled={isSubmitting || !selectedPayPeriodId}>
        {isSubmitting ? 'Starting…' : 'Start Payroll Run'}
      </button>

      <ActionStatusBanner status={status} />
    </form>
  );
}
