interface SpinnerProps {
  label: string;
}

export function Spinner({ label }: SpinnerProps) {
  return (
    <div role="status" aria-live="polite" className="spinner">
      <span className="spinner-circle" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
