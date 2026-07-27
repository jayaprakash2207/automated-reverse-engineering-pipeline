import { apiClient } from '../../../shared/api/apiClient';
import { PayPeriod } from '../types/payPeriod';

export const payPeriodApi = {
  list: () => apiClient.get<PayPeriod[]>('/pay-periods'),
  getById: (id: number) => apiClient.get<PayPeriod>(`/pay-periods/${id}`),
};
