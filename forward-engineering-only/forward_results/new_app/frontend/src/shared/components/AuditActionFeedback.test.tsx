import { render, screen } from "@testing-library/react";
import { AuditActionFeedback } from "./AuditActionFeedback";

describe("AuditActionFeedback", () => {
  it("renders nothing when idle", () => {
    const { container } = render(<AuditActionFeedback status="idle" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a pending message when pending", () => {
    render(<AuditActionFeedback status="pending" />);
    expect(screen.getByRole("status")).toHaveTextContent("Recording audit entry");
  });

  it("shows the audit entry id when successful", () => {
    render(<AuditActionFeedback status="success" auditEntryId="AUD-1234" />);
    expect(screen.getByRole("status")).toHaveTextContent("AUD-1234");
  });

  it("shows a fail-closed error with trace id when the audit write fails, when audit fails", () => {
    render(
      <AuditActionFeedback
        status="error"
        traceId="trace-abc-123"
        errorMessage="Database connection timed out"
      />
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("could not be confirmed");
    expect(alert).toHaveTextContent("trace-abc-123");
    expect(alert).toHaveTextContent("Database connection timed out");
  });
});
