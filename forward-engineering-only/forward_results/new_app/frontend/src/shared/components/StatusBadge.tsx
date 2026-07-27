import './StatusBadge.css';

export type StatusTone = 'neutral' | 'positive' | 'warning' | 'negative';

interface StatusBadgeProps {
  label: string;
  tone: StatusTone;
}

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  return <span className={`status-badge status-badge--${tone}`}>{label}</span>;
}
