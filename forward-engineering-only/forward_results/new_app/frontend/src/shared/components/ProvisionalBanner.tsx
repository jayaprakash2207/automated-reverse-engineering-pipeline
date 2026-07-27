import { useEnvironment } from '../hooks/useEnvironment';
import './ProvisionalBanner.css';

interface ProvisionalBannerProps {
  moduleName: string;
}

// Document 20 §5: Payroll Run and Pay Period business rules are unconfirmed (OQ-003).
// This banner must only ever appear outside production so stakeholders reviewing these
// contract-shape stub screens don't mistake them for validated functionality.
export function ProvisionalBanner({ moduleName }: ProvisionalBannerProps) {
  const environment = useEnvironment();

  if (environment === 'production') {
    return null;
  }

  return (
    <div className="provisional-banner" role="status">
      <strong>Provisional:</strong> {moduleName} is pending business rule confirmation.
      This is a contract-shape stub, not validated functionality.
    </div>
  );
}
