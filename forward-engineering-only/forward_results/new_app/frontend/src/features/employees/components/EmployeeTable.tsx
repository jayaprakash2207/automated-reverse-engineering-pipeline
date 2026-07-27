import { Link } from 'react-router-dom';
import { EmployeeDto } from '../types/employee';
import { EmployeeStatusBadge } from './EmployeeStatusBadge';

interface EmployeeTableProps {
  employees: EmployeeDto[];
}

export function EmployeeTable({ employees }: EmployeeTableProps) {
  if (employees.length === 0) {
    return <p>No employees match the current filters.</p>;
  }

  return (
    <table className="employee-table">
      <caption className="visually-hidden">Employees</caption>
      <thead>
        <tr>
          <th scope="col">Employee #</th>
          <th scope="col">Name</th>
          <th scope="col">Job Title</th>
          <th scope="col">Department</th>
          <th scope="col">Status</th>
        </tr>
      </thead>
      <tbody>
        {employees.map((employee) => (
          <tr key={employee.id}>
            <td>{employee.employee_number}</td>
            <td>
              <Link to={`/employees/${employee.id}`}>
                {employee.first_name} {employee.last_name}
              </Link>
            </td>
            <td>{employee.job_title}</td>
            <td>{employee.department}</td>
            <td>
              <EmployeeStatusBadge status={employee.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
