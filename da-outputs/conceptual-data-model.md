# Conceptual Data Model — HRMS

Business-language description of the concepts this system manages and how they relate. No table names, column types, or FK syntax below — see data-dictionary.md and erd.md for the technical mapping.

## Core concepts

**A Person** who works for the company is a **Worker**. Every Worker has one current **Job** (a role with a title, a family/track, and a compensation grade), belongs to one **Organizational Unit**, works out of one **Office**, and — except for the very top of the company — reports to exactly one other Worker (their manager). Organizational Units can themselves nest under a parent unit, forming a company hierarchy, and each has a home office, a cost-tracking code, and a named head.

A Worker's **Compensation Grade** defines an acceptable salary band for their role; grades also carry a name (Entry Level, Senior, Director, ...) and whether overtime pay applies.

Every Worker has personal identity information (legal name, date of birth, government ID, contact details, home address, an official photo, and free-form notes kept by HR) and an employment record (when they were hired, their current employment status — active, on leave, suspended, or terminated — and, if applicable, when and why they left). A Worker's government ID is treated as sensitive and stored encrypted; it can be decrypted only through a controlled security process.

A Worker may have zero or more **Dependents** (family members who might be covered by benefits) and zero or more **Emergency Contacts** (people to notify in a crisis) — neither of these people are Workers themselves and have no login of their own.

Whenever a Worker's status, department, or job changes, the intent is to keep a permanent **Change Record** capturing the before/after values and the reason — this is one of two competing change-tracking mechanisms in the system (see the Known Tension note below).

## Compensation

Each Worker has a **Salary History** — one entry per period their pay rate was in effect, including the reason for each change (annual review, promotion, new hire, ...) and who approved it.

Beyond base salary, a Worker's total pay is built from a catalogue of **Pay Components** — earnings, deductions, taxes, and benefits — each with its own calculation rule (a flat amount, a percentage, an hours-based rate, or a formula) and whether it's taxable, pre-tax, or employer-paid. A Worker can be individually enrolled into specific Pay Components with their own overrides (e.g. a specific 401(k) contribution percentage).

Pay is issued on a schedule of **Pay Periods**, grouped into **Payroll Runs** (regular, supplemental, bonus, or final/off-cycle). Each run produces a **Payroll Result** per Worker per Pay Component (hours, rate, amount, year-to-date total), which rolls up into run-level totals for gross pay, deductions, net pay, and employer cost.

A Worker's **Tax Profile** (filing status, allowances, extra withholding, exemption status) is tracked per tax year and is used against a table of **Tax Brackets** (which vary by year, filing status, and — for state tax — by state) to compute withholding.

A Worker can register one or more **Bank Accounts** for direct deposit, with a defined split (full amount, a fixed amount, a percentage, or "whatever's left") and a priority order when more than one account is used.

## Time off

The company recognizes a fixed set of **Leave Types** (paid time off, sick leave, compensatory time, family/medical leave, jury duty, bereavement), each with its own rules: whether it's paid, whether it accrues over time (and at what rate/frequency), a maximum balance, carryover limits and expiry, a minimum tenure before it can be used, and whether it needs approval or supporting documentation.

Each Worker has a running **Leave Balance** per leave type per calendar year (opening balance, amount accrued, amount used, manual adjustments, amount pending approval, and a computed amount currently available), plus a log of individual **Accrual Events** posted over time.

A Worker requests time off via a **Leave Request** (dates, whether it's a half day, a reason, an optional supporting document, and an approval workflow tracked through pending/approved/rejected/cancelled/taken states, with a designated approver — typically the Worker's manager).

The company also maintains a shared **Holiday Calendar**, optionally scoped to a specific office, with support for floating holidays.

## Performance management

The company runs periodic **Review Cycles** (e.g. an annual cycle) with defined windows for self-review, manager review, and calibration. Within a cycle, each Worker gets one **Performance Review** conducted by a specific reviewer (usually their manager), moving through stages from not-started to self-review, manager-review, a scheduled discussion, completion, and the Worker's acknowledgement. A review captures an overall rating, narrative sections (self-assessment, manager assessment, strengths, areas for improvement, a development plan, and the Worker's own comments), and — after a calibration step — a possibly-adjusted final rating.

Within a review, a Worker can have multiple **Performance Goals**, each with a title, description, category (business, development, leadership, innovation, or compliance — though the current data-entry screen can only assign three of these five categories), a relative weight, a target date, a progress percentage, and both a self-rating and a manager rating.

## Access, security, and oversight

Every Worker who uses the system logs in with a username and password (currently hashed with an outdated, weak algorithm — a flagged security concern) and gets a tracked **Session** (start time, end time, originating network address, which part of the system they opened). What a Worker is allowed to see or do is decided per-module-and-action by a permission check tied to their identity — there is no visible, dedicated table of named roles or permissions in the data model; that logic appears to live entirely inside program code rather than as governable data.

A centralized **Audit Trail** records who changed what, when, and (for a few specific kinds of changes — pay rate changes, leave status changes, and organizational unit changes) what the values were before and after. This is the second of the two competing change-tracking mechanisms in the system.

**Pending Approvals** — leave requests awaiting a decision and performance reviews awaiting manager sign-off — are surfaced together as a single unified queue for approvers, regardless of which business area they came from.

**Configuration** for the whole system (company name, default pay frequency, fiscal year start, session timeout, minimum password length, outbound mail settings, and whether the general-ledger and benefits-carrier feeds are currently turned on) is stored as a flat set of named parameters grouped by category, rather than as dedicated settings per module.

A general-purpose **Reference List** mechanism exists for simple named/coded dropdown values that don't warrant their own dedicated concept — its actual contents were not observable in this pass.

An **Outbound Notification** queue holds messages (email, in-app, or SMS) destined for a Worker or an external address, with delivery status and retry tracking, decoupling the business event that triggered a notification from its actual delivery.

## Known tensions in the conceptual model (worth resolving, not just documenting)

- **Two change-history mechanisms compete for the same job**: a Worker-specific, richly-typed Change Record concept, and a generic cross-cutting Audit Trail concept. Today, the generic Audit Trail is the one that actually works for the few areas it covers (pay, leave status, organizational units); the Worker-specific Change Record is currently broken by an implementation defect (see data-quality-report.md) even though it was clearly designed to be the primary, more detailed mechanism.
- **"Available leave balance" has two different definitions** depending on whether you look at the balance record directly or at the leave summary presented elsewhere — one subtracts pending requests, the other doesn't.
- **Access control exists only as code, not as governable data** — there is no table representing "roles" or "permissions" that a non-developer could inspect or change; this is the single biggest gap for anyone trying to answer "who can do what" from the data model alone.
