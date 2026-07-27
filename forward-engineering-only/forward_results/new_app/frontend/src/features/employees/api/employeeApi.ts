import { httpClient } from '../../../shared/api/httpClient';
import {
  CreateEmployeeRequest,
  EmployeeDto,
  EmployeeHistoryDto,
  EmployeeListFilters,
  PageResponse,
  PromoteRequest,
  RehireRequest,
  TerminateRequest,
  TransferRequest,
  UpdateEmployeeResponse,
} from '../types/employee';

// Action endpoints use plural resource nouns (transfers/promotions/
// terminations/rehires) rather than verbs in the path, consistent with Stack
// Mapping Contract row 3 ("no verbs in path"); each POST is the service layer
// creating a new EmployeeHistory row in the same transaction as the mutation
// (row 1 / Stack Mapping Contract §2 item 1 — no trigger-equivalent logic).
function buildQuery(filters: EmployeeListFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.department) params.set('department', filters.department);
  if (filters.status) params.set('status', filters.status);
  params.set('page', String(filters.page ?? 0));
  params.set('size', String(filters.size ?? 20));
  return params.toString();
}

export const employeeApi = {
  list(filters: EmployeeListFilters, signal?: AbortSignal) {
    return httpClient.get<PageResponse<EmployeeDto>>(`/employees?${buildQuery(filters)}`, signal);
  },
  getById(id: number, signal?: AbortSignal) {
    return httpClient.get<EmployeeDto>(`/employees/${id}`, signal);
  },
  getHistory(id: number, signal?: AbortSignal) {
    return httpClient.get<EmployeeHistoryDto[]>(`/employees/${id}/history`, signal);
  },
  create(payload: CreateEmployeeRequest) {
    return httpClient.post<EmployeeDto>('/employees', payload);
  },
  transfer(id: number, payload: TransferRequest) {
    return httpClient.post<UpdateEmployeeResponse>(`/employees/${id}/transfers`, payload);
  },
  promote(id: number, payload: PromoteRequest) {
    return httpClient.post<UpdateEmployeeResponse>(`/employees/${id}/promotions`, payload);
  },
  terminate(id: number, payload: TerminateRequest) {
    return httpClient.post<UpdateEmployeeResponse>(`/employees/${id}/terminations`, payload);
  },
  rehire(id: number, payload: RehireRequest) {
    return httpClient.post<UpdateEmployeeResponse>(`/employees/${id}/rehires`, payload);
  },
};
