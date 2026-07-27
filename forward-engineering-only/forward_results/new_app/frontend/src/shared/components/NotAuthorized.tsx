export function NotAuthorized() {
  return (
    <div role="alert" className="not-authorized">
      <h2>Access restricted</h2>
      <p>You do not have permission to view this page. Contact an administrator if you believe this is an error.</p>
    </div>
  );
}
