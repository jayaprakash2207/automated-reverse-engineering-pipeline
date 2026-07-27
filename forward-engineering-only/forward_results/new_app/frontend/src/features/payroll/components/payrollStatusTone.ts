import { StatusTone } from '../../../shared/components/StatusBadge';
import { PayrollRunStatus } from '../types/payrollRun';
import { PayPeriodStatus } from '../types/payPeriod';

export function payrollRunStatusTone(status: PayrollRunStatus): StatusTone {
  switch (status) {
    case 'COMPLETED':
      return 'positive';
    case 'PROCESSING':
      return 'neutral';
    case 'PENDING':
      return 'warning';
    case 'FAILED':
      return 'negative';
    default:
      return 'neutral';
  }
}

export function payPeriodStatusTone(status: PayPeriodStatus): StatusTone {
  switch (status) {
    case 'PROCESSED':
      return 'positive';
    case 'CLOSED':
      return 'warning';
    case 'OPEN':
      return 'neutral';
    default:
      return 'neutral';
  }
}
