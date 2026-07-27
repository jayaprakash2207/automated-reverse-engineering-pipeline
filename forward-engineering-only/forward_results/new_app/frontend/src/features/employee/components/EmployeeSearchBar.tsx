import { useState, type FormEvent } from 'react';
import type { EmployeeSearchParams } from '../types/employee';

interface EmployeeSearchBarProps {
  initial: Pick<EmployeeSearchParams, 'search' | 'department' | 'status'>;
  onSearch: (filters: Pick<EmployeeSearchParams, 'search' | 'department' | 'status'>) => void;
}

export function EmployeeSearchBar({ initial, onSearch }: EmployeeSearchBarProps) {
  const [search, setSearch] = useState(initial.search ?? '');
  const [department, setDepartment] = useState(initial.department ?? '');
  const [status, setStatus] = useState(initial.status ?? '');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSearch({
      search: search || undefined,
      department: department || undefined,
      status: (status || undefined) as EmployeeSearchParams['status'],
    });
  }

  return (
    <form onSubmit={handleSubmit} className="employee-search-bar" role="search" aria-label="Search employees">
      <div>
        <label htmlFor="employee-search">Name, email, or employee number</label>
        <input id="employee-search" type="text" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div>
        <label htmlFor="employee-department">Department</label>
        <input id="employee-department" type="text" value={department} onChange={(e) => setDepartment(e.target.value)} />
      </div>
      <div>
        <label htmlFor="employee-status">Status</label>
        <select id="employee-status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          <option value="ACTIVE">Active</option>
          <option value="ON_LEAVE">On Leave</option>
          <option value="TERMINATED">Terminated</option>
        </select>
      </div>
      <button type="submit">Search</button>
    </form>
  );
}
