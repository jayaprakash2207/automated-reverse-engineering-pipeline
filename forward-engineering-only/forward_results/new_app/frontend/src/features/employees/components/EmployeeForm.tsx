import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateEmployee } from '../hooks/useCreateEmployee';
import { ActionResultBanner } from './ActionResultBanner';

export function EmployeeForm() {
  const navigate = useNavigate();
  const { outcome, run } = useCreateEmployee();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [managerId, setManagerId] = useState('');

  useEffect(() => {
    if (outcome.kind === 'success') {
      navigate(`/employees/${outcome.result.id}`);
    }
  }, [outcome, navigate]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    run({
      first_name: firstName,
      last_name: lastName,
      email,
      job_title: jobTitle,
      department,
      hire_date: hireDate,
      manager_id: managerId ? Number(managerId) : null,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        First name
        <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
      </label>
      <label>
        Last name
        <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
      </label>
      <label>
        Email
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        Job title
        <input type="text" required value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
      </label>
      <label>
        Department
        <input
          type="text"
          required
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
        />
      </label>
      <label>
        Hire date
        <input type="date" required value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
      </label>
      <label>
        Manager ID (optional)
        <input type="number" value={managerId} onChange={(e) => setManagerId(e.target.value)} />
      </label>
      <ActionResultBanner outcome={outcome} renderSuccess={() => null} />
      <button type="submit" disabled={outcome.kind === 'submitting'}>
        Create employee
      </button>
    </form>
  );
}
