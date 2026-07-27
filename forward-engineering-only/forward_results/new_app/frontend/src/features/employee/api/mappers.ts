import type {
  CreateEmployeeInput,
  Employee,
  EmployeeHistoryEntry,
  LifecycleActionInput,
  LifecycleActionResult,
  Page,
  PageMeta,
} from '../types/employee';
import type {
  CreateEmployeeWire,
  EmployeeHistoryWire,
  EmployeeWire,
  LifecycleActionResultWire,
  LifecycleActionWire,
  PageMetaWire,
  PageWire,
} from './employeeApiTypes';

export function toEmployee(wire: EmployeeWire): Employee {
  return {
    id: wire.id,
    employeeNumber: wire.employee_number,
    firstName: wire.first_name,
    lastName: wire.last_name,
    email: wire.email,
    jobTitle: wire.job_title,
    department: wire.department,
    hireDate: wire.hire_date,
    status: wire.status,
    managerId: wire.manager_id,
    ssnLastFour: wire.ssn_last_four,
  };
}

export function toHistoryEntry(wire: EmployeeHistoryWire): EmployeeHistoryEntry {
  return {
    id: wire.id,
    employeeId: wire.employee_id,
    changeType: wire.change_type,
    previousDepartment: wire.previous_department,
    newDepartment: wire.new_department,
    previousJobTitle: wire.previous_job_title,
    newJobTitle: wire.new_job_title,
    effectiveDate: wire.effective_date,
    reason: wire.reason,
    changedAt: wire.changed_at,
    changedBy: wire.changed_by,
  };
}

function toPageMeta(wire: PageMetaWire): PageMeta {
  return {
    pageNumber: wire.page_number,
    pageSize: wire.page_size,
    totalElements: wire.total_elements,
    totalPages: wire.total_pages,
  };
}

export function toEmployeePage(wire: PageWire<EmployeeWire>): Page<Employee> {
  return { content: wire.content.map(toEmployee), page: toPageMeta(wire.page) };
}

export function toCreateEmployeeWire(input: CreateEmployeeInput): CreateEmployeeWire {
  return {
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    job_title: input.jobTitle,
    department: input.department,
    hire_date: input.hireDate,
    ssn: input.ssn,
    manager_id: input.managerId ?? null,
  };
}

export function toLifecycleActionWire(input: LifecycleActionInput): LifecycleActionWire {
  return {
    change_type: input.changeType,
    department: input.department,
    job_title: input.jobTitle,
    manager_id: input.managerId,
    effective_date: input.effectiveDate,
    reason: input.reason,
  };
}

export function toLifecycleActionResult(wire: LifecycleActionResultWire): LifecycleActionResult {
  return {
    employee: toEmployee(wire.employee),
    historyEntry: toHistoryEntry(wire.history_entry),
    auditEntryId: wire.audit_entry_id,
  };
}
