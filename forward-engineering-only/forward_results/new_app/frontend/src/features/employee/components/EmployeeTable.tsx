import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Employee } from '../types/employee';
import { StatusBadge } from './StatusBadge';

export function EmployeeTable({ employees }: { employees: Employee[] }) {
  const navigate = useNavigate();

  function goToDetail(id: number) {
    navigate(`/employees/${id}`);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTableRowElement>, id: number) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      goToDetail(id);
    }
  }

  if (employees.length === 0) {
    return <p>No employees match the current filters.</p>;
  }

  return (
    <table className="employee-table">
      <caption className="sr-only">Employee list</caption>
      <thead>
        <tr>
          <th scope="col">Name</th>
          <th scope="col">Employee #</th>
          <th scope="col">Department</th>
          <th scope="col">Job Title</th>
          <th scope="col">Status</th>
        </tr>
      </thead>
      <tbody>
        {employees.map((employee) => (
          <tr
            key={employee.id}
            tabIndex={0}
            role="link"
            aria-label={`View details for ${employee.firstName} ${employee.lastName}`}
            onClick={() => goToDetail(employee.id)}
            onKeyDown={(event) => handleKeyDown(event, employee.id)}
            className="employee-table__row"
          >
            <td>
              {employee.firstName} {employee.lastName}
            </td>
            <td>{employee.employeeNumber}</td>
            <td>{employee.department}</td>
            <td>{employee.jobTitle}</td>
            <td>
              <StatusBadge status={employee.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
