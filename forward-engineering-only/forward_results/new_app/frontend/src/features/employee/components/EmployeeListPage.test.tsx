import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EmployeeListPage } from './EmployeeListPage';
import * as employeeApi from '../api/employeeApi';
import type { Employee } from '../types/employee';

jest.mock('../api/employeeApi');

const mockEmployee: Employee = {
  id: 1,
  employeeNumber: 'EMP-001',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  jobTitle: 'Engineer',
  department: 'Engineering',
  hireDate: '2020-01-01',
  status: 'ACTIVE',
  managerId: null,
  ssnLastFour: '1234',
};

describe('EmployeeListPage', () => {
  it('renders employees returned by the API', async () => {
    jest.spyOn(employeeApi, 'listEmployees').mockResolvedValue({
      content: [mockEmployee],
      page: { pageNumber: 0, pageSize: 20, totalElements: 1, totalPages: 1 },
    });

    render(
      <MemoryRouter>
        <EmployeeListPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('EMP-001')).toBeInTheDocument();
  });

  it('shows a retry option when loading fails, not a blank screen', async () => {
    jest.spyOn(employeeApi, 'listEmployees').mockRejectedValue(new Error('network down'));

    render(
      <MemoryRouter>
        <EmployeeListPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
