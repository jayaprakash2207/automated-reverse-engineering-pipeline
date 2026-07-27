import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useEmployees } from '../hooks/useEmployees';
import { EmployeeSearchBar } from './EmployeeSearchBar';
import { EmployeeTable } from './EmployeeTable';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { Pagination } from '../../../shared/components/Pagination';
import type { EmployeeSearchParams } from '../types/employee';

export function EmployeeListPage() {
  const [filters, setFilters] = useState<EmployeeSearchParams>({ page: 0, size: 20 });
  const { employees, pageMeta, loading, error, refetch } = useEmployees(filters);

  return (
    <section aria-labelledby="employee-list-heading">
      <div className="page-header">
        <h1 id="employee-list-heading">Employees</h1>
        <Link to="/employees/new" className="button-primary">
          New Employee
        </Link>
      </div>

      <EmployeeSearchBar
        initial={filters}
        onSearch={(next) => setFilters((prev) => ({ ...prev, ...next, page: 0 }))}
      />

      {loading && <LoadingSpinner label="Loading employees…" />}

      {!loading && error && (
        <div role="alert" className="action-banner action-banner--system">
          <p>{error}</p>
          <button type="button" onClick={refetch}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <EmployeeTable employees={employees} />
          {pageMeta && (
            <Pagination page={pageMeta} onPageChange={(pageNumber) => setFilters((prev) => ({ ...prev, page: pageNumber }))} />
          )}
        </>
      )}
    </section>
  );
}
