export type PayrollRunStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface PayrollRun {
  id: number;
  payPeriodId: number;
  status: PayrollRunStatus;
  runDate: string;
  totalGrossPay: number | null;
  totalNetPay: number | null;
  employeeCount: number | null;
  createdAt: string;
}

export interface CreatePayrollRunRequest {
  payPeriodId: number;
}
