import { apiRequest } from "../../../shared/api/httpClient";
import { fetchAuditLogs } from "./auditLogApi";
import { DEFAULT_AUDIT_LOG_FILTERS } from "../types/auditLog";

jest.mock("../../../shared/api/httpClient");

const mockedApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

const emptyPage = { content: [], totalElements: 0, totalPages: 0, page: 0, size: 25 };

describe("fetchAuditLogs", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedApiRequest.mockResolvedValue(emptyPage);
  });

  it("always sends page and size, with no optional filters when none are set", async () => {
    await fetchAuditLogs(DEFAULT_AUDIT_LOG_FILTERS);

    const [path] = mockedApiRequest.mock.calls[0];
    const [, query] = path.split("?");
    const params = new URLSearchParams(query);
    expect(params.get("page")).toBe("0");
    expect(params.get("size")).toBe("25");
    expect(params.has("actorName")).toBe(false);
    expect(params.has("actionType")).toBe(false);
    expect(params.has("entityType")).toBe(false);
    expect(params.has("outcome")).toBe(false);
    expect(params.has("fromDate")).toBe(false);
    expect(params.has("toDate")).toBe(false);
  });

  it("includes each optional filter only when it is set", async () => {
    await fetchAuditLogs({
      page: 2,
      size: 50,
      actorName: "Jordan Lee",
      actionType: "LEAVE_APPROVE",
      entityType: "LeaveRequest",
      outcome: "FAILURE",
      fromDate: "2026-01-01",
      toDate: "2026-01-31",
    });

    const [path] = mockedApiRequest.mock.calls[0];
    const params = new URLSearchParams(path.split("?")[1]);
    expect(params.get("page")).toBe("2");
    expect(params.get("size")).toBe("50");
    expect(params.get("actorName")).toBe("Jordan Lee");
    expect(params.get("actionType")).toBe("LEAVE_APPROVE");
    expect(params.get("entityType")).toBe("LeaveRequest");
    expect(params.get("outcome")).toBe("FAILURE");
    expect(params.get("fromDate")).toBe("2026-01-01");
    expect(params.get("toDate")).toBe("2026-01-31");
  });

  it("issues a GET request and forwards the abort signal", async () => {
    const controller = new AbortController();
    await fetchAuditLogs(DEFAULT_AUDIT_LOG_FILTERS, controller.signal);

    const [, options] = mockedApiRequest.mock.calls[0];
    expect(options).toEqual(
      expect.objectContaining({ method: "GET", signal: controller.signal })
    );
  });

  it("propagates the resolved page response unchanged", async () => {
    const page = {
      content: [
        {
          id: "1",
          timestamp: "2026-07-20T10:00:00Z",
          actorId: "u1",
          actorName: "Jordan Lee",
          actionType: "HIRE",
          entityType: "EMPLOYEE",
          entityId: "42",
          outcome: "SUCCESS" as const,
        },
      ],
      totalElements: 1,
      totalPages: 1,
      page: 0,
      size: 25,
    };
    mockedApiRequest.mockResolvedValue(page);

    await expect(fetchAuditLogs(DEFAULT_AUDIT_LOG_FILTERS)).resolves.toEqual(page);
  });

  // KNOWN CONTRACT MISMATCH: AuditController (backend/src/main/java/com/example/app/
  // audit/controller/AuditController.java) is @RequestMapping("/api/v1/audit-entries")
  // -- confirmed against a real Postgres-backed server by
  // AuditControllerIntegrationTest#should_return200_when_adminSearchesAuditEntries. This
  // client instead requests "/audit-logs", so every call this function makes 404s against
  // the real backend today. Written against the verified backend route rather than against
  // this file's current (wrong) behavior, so it stays red as a visible flag until the two
  // sides are reconciled -- either this path changes to "/audit-entries", or the backend
  // gains a matching route. See also AuditLogPage.test.tsx's "AUDIT_REVIEWER" test for the
  // matching role-name mismatch between these same two layers.
  it("requests the resource path the backend actually serves (/audit-entries)", async () => {
    await fetchAuditLogs(DEFAULT_AUDIT_LOG_FILTERS);

    const [path] = mockedApiRequest.mock.calls[0];
    expect(path.startsWith("/audit-entries")).toBe(true);
  });
});
