# Business Capability Model

## Confidence note
The Business Analysis layer states that a "Business Capability Map" was produced, but its content was not included in the material handed to this synthesis step (only the summary paragraph was available). The capability model below is therefore derived **only** from the six named value streams and the one detailed pain point — it is a partial reconstruction, not the original BA capability map.

## Level 1 Capabilities (derived from value streams — MEDIUM confidence)

| Capability | Supporting Value Stream | Status | Confidence |
|---|---|---|---|
| Manage Employee Lifecycle | Employee Lifecycle | **Broken** — transfer/promote/terminate/rehire all fail on a trigger defect | HIGH (defect), MEDIUM (capability framing) |
| Manage Leave | Leave Request | **Partially implemented** — submission and self-cancellation only; no approval | HIGH (defect), MEDIUM (capability framing) |
| Manage Pay Periods | Pay Period | Unknown implementation status — no detail provided | LOW |
| Process Payroll | Payroll Run | Unknown implementation status — no detail provided | LOW |
| Manage Performance Review Cycles | Review Cycle | Unknown implementation status — no detail provided | LOW |
| Conduct Individual Reviews | Individual Review | Unknown implementation status — no detail provided | LOW |
| Authenticate Users (cross-cutting, not a named value stream but required by all others) | — (identified by this synthesis, not by BA) | **Broken** — no password verification occurs | HIGH (defect) / ASSUMED (as a distinct capability, since BA's summary did not name it) |

## What is missing
- Capability decomposition to Level 2/3 (sub-capabilities) — not available.
- Capability-to-KPI mapping — not available.
- Capability maturity/heat-map scoring — not available.

These gaps should be filled from the full BA_Deep_Analyst.md report before this model is treated as final (see OQ-010).