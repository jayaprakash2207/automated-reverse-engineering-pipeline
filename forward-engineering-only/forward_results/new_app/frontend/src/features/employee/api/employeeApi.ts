import { request } from '../../../shared/api/httpClient';
import type { EmployeeWire, EmployeeHistoryWire, LifecycleActionResultWire, PageWire } from './employeeApiTypes';
import {
  toCreateEmployeeWire,
  toEmployee,
  toEmployeePage,
  toHistoryEntry,
  toLifecycleActionResult,
  toLifecycleActionWire,
} from './mappers';
import type {
  CreateEmployeeInput,
  Employee,
  EmployeeHistoryEntry,
  EmployeeSearchParams,
  LifecycleActionInput,
  LifecycleActionResult,
  Page,
} from '../types/employee';

// Endpoints follow Stack Mapping Contract row 3: one controller per resource
// at /api/v1/employees, no verbs in the path. Lifecycle actions (transfer /
// promote / terminate / rehire) are modeled as a single PATCH carrying a
// change_type discriminator plus UpdateEmployeeRequest fields, consistent with
// the backend reference file list exposing one UpdateEmployeeRequest /
// UpdateEmployeeResponse pair rather than four separate endpoints.
const BASE_PATH = '/employees';

export async function listEmployees(params: EmployeeSearchParams): Promise<Page<Employee>> {
  const wire = await request<PageWire<EmployeeWire>>(BASE_PATH, {
    query: {
      search: params.search,
      department: params.department,
      status: params.status,
      page: params.page ?? 0,
      size: params.size ?? 20,
    },
  });
  return toEmployeePage(wire);
}

export async function getEmployee(id: number): Promise<Employee> {
  const wire = await request<EmployeeWire>(`${BASE_PATH}/${id}`);
  return toEmployee(wire);
}

export async function createEmployee(input: CreateEmployeeInput): Promise<Employee> {
  const wire = await request<EmployeeWire>(BASE_PATH, {
    method: 'POST',
    body: toCreateEmployeeWire(input),
  });
  return toEmployee(wire);
}

export async function applyLifecycleAction(
  id: number,
  input: LifecycleActionInput,
): Promise<LifecycleActionResult> {
  const wire = await request<LifecycleActionResultWire>(`${BASE_PATH}/${id}`, {
    method: 'PATCH',
    body: toLifecycleActionWire(input),
  });
  return toLifecycleActionResult(wire);
}

export async function getEmployeeHistory(id: number): Promise<EmployeeHistoryEntry[]> {
  const wire = await request<EmployeeHistoryWire[]>(`${BASE_PATH}/${id}/history`);
  return wire.map(toHistoryEntry);
}
