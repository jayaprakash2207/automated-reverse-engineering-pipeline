import { render, screen, waitFor } from "@testing-library/react";
import App from "../../App";

// True end-to-end coverage for the Action Audit Logging screen: nothing internal is
// mocked (not the api client, not the http client, not jwt decoding, not routing) --
// only `global.fetch`, the actual network boundary, is stubbed. This exercises the real
// chain a browser would: BrowserRouter -> AuditLogPage -> useAuditLogs -> fetchAuditLogs
// -> apiRequest (attaches the bearer token, builds the query string) -> fetch. No
// Cypress/Playwright is configured for this project (frontend/package.json only lists
// Jest + RTL), so this is the closest available approximation to a browser-driven E2E
// test for this sprint.

function fakeJwt(roles: string[]): string {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({ sub: "1", roles, exp: Math.floor(Date.now() / 1000) + 3600 })
  );
  return `${header}.${payload}.signature`;
}

describe("Action Audit Log screen (end-to-end)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("blocks an unauthenticated visitor before ever calling the network", async () => {
    render(<App />);

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("do not have permission")
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("logs in as ADMIN, fetches over a real bearer-authenticated request, and renders the row", async () => {
    const token = fakeJwt(["ADMIN"]);
    window.localStorage.setItem("authToken", token);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        content: [
          {
            id: "1",
            timestamp: "2026-07-20T10:00:00Z",
            actorId: "u1",
            actorName: "Jordan Lee",
            actionType: "LEAVE_APPROVE",
            entityType: "LeaveRequest",
            entityId: "42",
            outcome: "SUCCESS",
          },
        ],
        totalElements: 1,
        totalPages: 1,
        page: 0,
        size: 25,
      }),
    });

    render(<App />);

    await waitFor(() => expect(screen.getByText("Jordan Lee")).toBeInTheDocument());

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe("/api/v1/audit-logs?page=0&size=25");
    expect(options.headers.Authorization).toBe(`Bearer ${token}`);
  });

  it("surfaces the backend's structured error message end-to-end when the request fails", async () => {
    window.localStorage.setItem("authToken", fakeJwt(["ADMIN"]));
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        timestamp: "2026-07-25T00:00:00Z",
        status: 403,
        errorCode: "FORBIDDEN",
        message: "You do not have access to this resource.",
        path: "/api/v1/audit-logs",
        traceId: "trace-e2e-1",
      }),
    });

    render(<App />);

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "You do not have access to this resource."
      )
    );
  });
});
