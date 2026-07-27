import { CreateEmployeeForm } from './CreateEmployeeForm';

export function CreateEmployeePage() {
  return (
    <section aria-labelledby="create-employee-heading">
      <h1 id="create-employee-heading">New Employee</h1>
      <CreateEmployeeForm />
    </section>
  );
}
