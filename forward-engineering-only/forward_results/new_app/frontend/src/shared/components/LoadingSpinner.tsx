interface LoadingSpinnerProps {
  label?: string;
}

export function LoadingSpinner({ label = 'Loading' }: LoadingSpinnerProps) {
  return (
    <div role="status" aria-live="polite" className="loading-spinner">
      <span aria-hidden="true">⏳</span>
      <span>{label}…</span>
    </div>
  );
}
