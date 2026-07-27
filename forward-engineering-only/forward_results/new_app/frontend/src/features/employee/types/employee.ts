export type EmployeeStatus = 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';

// Mirrors backend ChangeType (com.example.app.employee.domain.ChangeType),
// scoped to the actions named explicitly in the UI/UX spec (Doc 20 §3):
// transfer / promote / terminate / rehire, plus the initial hire event that
// seeds an employee's first history row.
export type ChangeType = 'HIRE' | 'TRANSFER' | 'PROMOTION' | 'TERMINATION' | 'REHIRE';

export interface Employee {
  id: number;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  department: string;
  hireDate: string;
  status: EmployeeStatus;
  managerId: number | null;
  // SSN is encrypted at rest via SsnEncryptedConverter and is assumed to never
  // be returned in full over the API; only a display-safe suffix is rendered.
  ssnLastFour: string;
}

export interface EmployeeHistoryEntry {
  id: number;
  employeeId: number;
  changeType: ChangeType;
  previousDepartment: string | null;
  newDepartment: string | null;
  previousJobTitle: string | null;
  newJobTitle: string | null;
  effectiveDate: string;
  reason: string | null;
  changedAt: string;
  changedBy: string;
}

export interface CreateEmployeeInput {
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  department: string;
  hireDate: string;
  ssn: string;
  managerId?: number | null;
}

export interface LifecycleActionInput {
  changeType: ChangeType;
  department?: string;
  jobTitle?: string;
  managerId?: number | null;
  effectiveDate: string;
  reason?: string;
}

export interface LifecycleActionResult {
  employee: Employee;
  historyEntry: EmployeeHistoryEntry;
  // Surfaced per Frontend Architecture §4 / UI/UX Doc 20 §2: the UI must be
  // able to show that an action's audit entry was actually recorded, so a
  // failed audit write is never invisible to the user.
  auditEntryId: string;
}

export interface PageMeta {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

export interface Page<T> {
  content: T[];
  page: PageMeta;
}

export interface EmployeeSearchParams {
  search?: string;
  department?: string;
  status?: EmployeeStatus;
  page?: number;
  size?: number;
}
