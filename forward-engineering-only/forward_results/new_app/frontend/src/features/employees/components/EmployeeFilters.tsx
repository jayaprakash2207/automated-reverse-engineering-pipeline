import { FormEvent, useState } from 'react';
import { EmployeeListFilters, EmployeeStatus } from '../types/employee';

interface EmployeeFiltersProps {
  value: EmployeeListFilters;
  onChange: (filters: EmployeeListFilters) => void;
}

const STATUS_OPTIONS: EmployeeStatus[] = ['ACTIVE', 'ON_LEAVE', 'TERMINATED'];

export function EmployeeFilters({ value, onChange }: EmployeeFiltersProps) {
  const [search, setSearch] = useState(value.search ?? '');
  const [department, setDepartment] = useState(value.department ?? '');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onChange({ ...value, search, department, page: 0 });
  }

  function handleStatusChange(status: string) {
    onChange({
      ...value,
      status: status ? (status as EmployeeStatus) : undefined,
      page: 0,
    });
  }

  function handleReset() {
    setSearch('');
    setDepartment('');
    onChange({ page: 0, size: value.size });
  }

  return (
    <form className="employee-filters" onSubmit={handleSubmit} role="search">
      <label>
        Search
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name or employee number"
        />
      </label>
      <label>
        Department
        <input
          type="text"
          value={department}
          onChange={(event) => setDepartment(event.target.value)}
        />
      </label>
      <label>
        Status
        <select value={value.status ?? ''} onChange={(event) => handleStatusChange(event.target.value)}>
          <option value="">All</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <button type="submit">Apply</button>
      <button type="button" onClick={handleReset}>
        Reset
      </button>
    </form>
  );
}
