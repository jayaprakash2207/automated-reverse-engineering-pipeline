/**
 * Backend contract assumption: EmployeeController, EmployeeDto,
 * EmployeeHistoryDto, ChangeType, EmployeeStatus, PageResponse/PageMeta,
 * CreateEmployeeRequest/UpdateEmployeeRequest/UpdateEmployeeResponse are all
 * listed as reference-only for this sprint but are undelivered in this
 * environment (known-issues log: WinError 2 — environment gap, not a code
 * fix). The shapes below are inferred from those DTO/enum names plus Stack
 * Mapping Contract rows 3/8 (plural kebab-case REST nouns, snake_case JSON
 * per application.yml's Jackson SNAKE_CASE naming strategy) so the frontend
 * has a single, internally consistent contract to build and test against.
 * Field-for-field alignment must be verified against the real DTOs once the
 * backend agent's output lands.
 */

export type EmployeeStatus = 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';

export type ChangeType = 'HIRE' | 'TRANSFER' | 'PROMOTION' | 'TERMINATION' | 'REHIRE';

export interface EmployeeDto {
  id: number;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  job_title: string;
  department: string;
  manager_id: number | null;
  hire_date: string;
  status: EmployeeStatus;
  created_at: string;
  updated_at: string;
}

export interface EmployeeHistoryDto {
  id: number;
  employee_id: number;
  change_type: ChangeType;
  effective_date: string;
  previous_value: string | null;
  new_value: string | null;
  reason: string | null;
  changed_by: string;
  changed_at: string;
}

export interface PageMeta {
  page: number;
  size: number;
  total_elements: number;
  total_pages: number;
}

export interface PageResponse<T> {
  content: T[];
  page: PageMeta;
}

export interface EmployeeListFilters {
  search?: string;
  department?: string;
  status?: EmployeeStatus;
  page?: number;
  size?: number;
}

export interface CreateEmployeeRequest {
  first_name: string;
  last_name: string;
  email: string;
  job_title: string;
  department: string;
  manager_id?: number | null;
  hire_date: string;
}

export interface UpdateEmployeeResponse {
  employee: EmployeeDto;
  history_entry: EmployeeHistoryDto;
}

export interface TransferRequest {
  new_department: string;
  new_manager_id?: number | null;
  effective_date: string;
  reason?: string;
}

export interface PromoteRequest {
  new_job_title: string;
  effective_date: string;
  reason?: string;
}

export interface TerminateRequest {
  effective_date: string;
  reason: string;
}

export interface RehireRequest {
  job_title: string;
  department: string;
  effective_date: string;
  reason?: string;
}
