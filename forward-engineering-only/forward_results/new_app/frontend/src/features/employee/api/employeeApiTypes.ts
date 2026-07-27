// Wire-format ("on the network") types, matching the backend's Jackson
// SNAKE_CASE property naming strategy configured in application.yml
// (spring.jackson.property-naming-strategy: SNAKE_CASE). Kept distinct from
// the camelCase domain types in ../types/employee so a naming-strategy change
// on either side only touches mappers.ts.
import type { ChangeType, EmployeeStatus } from '../types/employee';

export interface EmployeeWire {
  id: number;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  job_title: string;
  department: string;
  hire_date: string;
  status: EmployeeStatus;
  manager_id: number | null;
  ssn_last_four: string;
}

export interface EmployeeHistoryWire {
  id: number;
  employee_id: number;
  change_type: ChangeType;
  previous_department: string | null;
  new_department: string | null;
  previous_job_title: string | null;
  new_job_title: string | null;
  effective_date: string;
  reason: string | null;
  changed_at: string;
  changed_by: string;
}

export interface CreateEmployeeWire {
  first_name: string;
  last_name: string;
  email: string;
  job_title: string;
  department: string;
  hire_date: string;
  ssn: string;
  manager_id?: number | null;
}

export interface LifecycleActionWire {
  change_type: ChangeType;
  department?: string;
  job_title?: string;
  manager_id?: number | null;
  effective_date: string;
  reason?: string;
}

export interface LifecycleActionResultWire {
  employee: EmployeeWire;
  history_entry: EmployeeHistoryWire;
  audit_entry_id: string;
}

export interface PageMetaWire {
  page_number: number;
  page_size: number;
  total_elements: number;
  total_pages: number;
}

export interface PageWire<T> {
  content: T[];
  page: PageMetaWire;
}
