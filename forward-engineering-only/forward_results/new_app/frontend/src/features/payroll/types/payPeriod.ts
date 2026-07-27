export type PayPeriodStatus = 'OPEN' | 'CLOSED' | 'PROCESSED';

export interface PayPeriod {
  id: number;
  startDate: string;
  endDate: string;
  payDate: string;
  status: PayPeriodStatus;
}
