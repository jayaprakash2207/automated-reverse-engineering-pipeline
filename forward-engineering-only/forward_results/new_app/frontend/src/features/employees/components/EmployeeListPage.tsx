import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useEmployeeList } from '../hooks/useEmployeeList';
import { EmployeeListFilters } from '../types/employee';
import { EmployeeFilters } from './EmployeeFilters';
import { EmployeeTable } from './EmployeeTable';
import { Pagination } from '../../../shared/components/Pagination';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';

const DEFAULT_FILTERS: EmployeeListFilters = { page: 0, size: 20 };

export function EmployeeListPage() {
  const [filters, setFilters] = useState<EmployeeListFilters>(DEFAULT_FILTERS);
  const { employees, pageMeta, loading, error, reload } = useEmployeeList(filters);

  return (
    <main>
      <div className="page-header">
        <h1>Employees</h1>
        <Link to="/employees/new">Add Employee</Link>
      </div>
      <EmployeeFilters value={filters} onChange={setFilters} />
      {loading && <LoadingSpinner label="Loading employees" />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && (
        <>
          <EmployeeTable employees={employees} />
          {pageMeta && (
            <Pagination
              page={pageMeta.page}
              totalPages={pageMeta.total_pages}
              onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
            />
          )}
        </>
      )}
    </main>
  );
}
