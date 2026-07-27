import { useAsyncOutcome } from '../../../shared/hooks/useAsyncOutcome';
import { employeeApi } from '../api/employeeApi';
import { CreateEmployeeRequest, EmployeeDto } from '../types/employee';

export function useCreateEmployee() {
  return useAsyncOutcome<CreateEmployeeRequest, EmployeeDto>(employeeApi.create);
}
