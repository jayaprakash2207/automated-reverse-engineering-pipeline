import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateEmployee } from '../hooks/useCreateEmployee';
import { ActionResultBanner } from '../../../shared/components/ActionResultBanner';
import { isRequired, isValidEmail, isValidSsn, isValidDate } from '../utils/validation';

interface FormErrors {
  [field: string]: string;
}

export function CreateEmployeeForm() {
  const navigate = useNavigate();
  const { state, execute } = useCreateEmployee();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [ssn, setSsn] = useState('');
  const [clientErrors, setClientErrors] = useState<FormErrors>({});

  const isSubmitting = state.status === 'submitting';

  function validate(): FormErrors {
    const errors: FormErrors = {};
    if (!isRequired(firstName)) errors.firstName = 'First name is required.';
    if (!isRequired(lastName)) errors.lastName = 'Last name is required.';
    if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';
    if (!isRequired(jobTitle)) errors.jobTitle = 'Job title is required.';
    if (!isRequired(department)) errors.department = 'Department is required.';
    if (!isValidDate(hireDate)) errors.hireDate = 'Enter a valid hire date.';
    if (!isValidSsn(ssn)) errors.ssn = 'Enter a 9-digit SSN.';
    return errors;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const errors = validate();
    setClientErrors(errors);
    if (Object.keys(errors).length > 0) return;

    await execute({ firstName, lastName, email, jobTitle, department, hireDate, ssn });
  }

  if (state.status === 'success') {
    navigate(`/employees/${state.data.id}`);
    return null;
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="create-first-name">First name</label>
        <input id="create-first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={isSubmitting} />
        {clientErrors.firstName && <p className="field-error">{clientErrors.firstName}</p>}
      </div>

      <div>
        <label htmlFor="create-last-name">Last name</label>
        <input id="create-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={isSubmitting} />
        {clientErrors.lastName && <p className="field-error">{clientErrors.lastName}</p>}
      </div>

      <div>
        <label htmlFor="create-email">Email</label>
        <input id="create-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isSubmitting} />
        {clientErrors.email && <p className="field-error">{clientErrors.email}</p>}
      </div>

      <div>
        <label htmlFor="create-job-title">Job title</label>
        <input id="create-job-title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} disabled={isSubmitting} />
        {clientErrors.jobTitle && <p className="field-error">{clientErrors.jobTitle}</p>}
      </div>

      <div>
        <label htmlFor="create-department">Department</label>
        <input id="create-department" value={department} onChange={(e) => setDepartment(e.target.value)} disabled={isSubmitting} />
        {clientErrors.department && <p className="field-error">{clientErrors.department}</p>}
      </div>

      <div>
        <label htmlFor="create-hire-date">Hire date</label>
        <input
          id="create-hire-date"
          type="date"
          value={hireDate}
          onChange={(e) => setHireDate(e.target.value)}
          disabled={isSubmitting}
        />
        {clientErrors.hireDate && <p className="field-error">{clientErrors.hireDate}</p>}
      </div>

      <div>
        <label htmlFor="create-ssn">SSN</label>
        <input
          id="create-ssn"
          type="password"
          autoComplete="off"
          value={ssn}
          onChange={(e) => setSsn(e.target.value)}
          disabled={isSubmitting}
        />
        {clientErrors.ssn && <p className="field-error">{clientErrors.ssn}</p>}
      </div>

      <ActionResultBanner state={state} />

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating…' : 'Create Employee'}
      </button>
    </form>
  );
}
