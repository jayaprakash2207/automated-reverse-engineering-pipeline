import { apiClient } from '../../../shared/api/apiClient';
import { CreatePayrollRunRequest, PayrollRun } from '../types/payrollRun';

export const payrollRunApi = {
  list: () => apiClient.get<PayrollRun[]>('/payroll-runs'),
  getById: (id: number) => apiClient.get<PayrollRun>(`/payroll-runs/${id}`),
  create: (request: CreatePayrollRunRequest) => apiClient.post<PayrollRun>('/payroll-runs', request),
};
