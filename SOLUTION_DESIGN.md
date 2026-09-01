# Solution Design — Integration Prototype

**Prepared for:** Param Foundation / Param Science Experience Centre
**Role context:** Full Stack Technical Lead & Integration Architect
**Author:** Achyuth Unni
**Date:** 2 September 2026

> A note on assumptions. The interpretation of the four domains below is based on the role
> description and the general shape of a science centre's operations. It has not been
> validated against Param's actual systems or processes, and doing so would be the first
> step in a real engagement. All sample data is illustrative.

---

## 1. Summary

The task asks for a prototype integrating procurement, project tracking, budget, and
ticketing into a unified platform.

The design decision that shapes everything else is this: **the four domains are kept
strictly independent, and every piece of information that crosses between them travels as
a message through a shared log.** No module reads another module's data directly.

This is deliberately harder than putting all four domains in one schema with foreign keys
between them. The reasoning is in section 3, and it is the argument this prototype exists
to make.

---

## 2. Problem analysis

A science centre runs four functions that each hold accurate data about themselves and
stale data about everything else.

| Domain | Owns | Typically lives in |
|---|---|---|
| Budget | Allocations, commitments, spend, income | Finance spreadsheets or accounting software |
| Procurement | Vendors, purchase requests, orders | Email threads and paper approvals |
| Project tracking | Gallery and exhibit builds, milestones | A shared spreadsheet |
| Ticketing | Visitor sales, gallery availability | A counter system or vendor platform |

The symptoms this produces are specific and recognisable:

**Money is committed invisibly.** A purchase request for ₹6,40,000 is approved and sent to
a fabricator. The budget sheet still shows that money as available, because it has not
been paid yet. A second purchase gets approved against funds that are already promised.
The overspend surfaces at month-end reconciliation.

**Purchases are raised without knowing the balance.** The person raising a request has no
live view of what the project has left, so the check happens later, by a different person,
after the commitment has already been made.

**Operations doesn't know what projects are doing.** A gallery closes for a refresh and the
ticket counter keeps selling access to it, because the closure was communicated verbally.

**Nobody can cost a gallery.** Ticket income and project spend live in different files, so
the question "what did this gallery cost and what does it earn" requires manual work every
time it is asked.

The root cause is not missing data. Each domain's data is correct. The problem is that
updates travel between domains by human relay — a message, a phone call, a forwarded
email. The integration layer is a person, and people are slow and occasionally on leave.

---

## 3. Design

### The core rule

Four modules, hard boundaries, and one message log between them.

**No module reads another module's tables.** Procurement cannot query the budget tables.
If it needs to know whether funds are available, it publishes a request and waits for an
answer.

### Why not one shared schema

The obvious alternative is a single relational schema where `PurchaseRequest` has a
foreign key to `Project`, and approving a purchase runs a transaction that increments
`project.spentBudget`. It is simpler, faster to build, and it works.

It is also the design that fails first. Three reasons:

**Replaceability.** Param will eventually run real accounting software, or already does.
When the budget domain moves into that system, a shared schema means every query in
procurement and projects that touched budget tables has to be found and rewritten. With
the boundary in place, the budget module is swapped for an adapter to the external system
and nothing else changes, because nothing else ever spoke to it any other way.

**Auditability.** An organisation handling grant and trust funds needs to be able to
answer "why was this approved, when, and against what balance." When every cross-domain
decision is a durable message, that record exists by construction rather than being
retrofitted as logging.

**Failure isolation.** If a handler fails, the message stays unprocessed and can be
retried. In a direct-call design, a failure mid-chain leaves partial state with no record
of what was meant to happen next.

### Why a modular monolith and not microservices

Four services means four deployments, four log streams, four sets of environment
configuration, and network calls where function calls would do — for a team of this size,
that is cost without benefit. A single application with sealed modules gives the boundary
discipline at a fraction of the operational overhead, and because the modules never share
tables or imports, any one of them can be extracted into its own service later without
touching the others.

The architecture is sized for the organisation as it is, with a path to the organisation
as it grows.

### A log versus a bus

It is worth distinguishing this from an audit log. An audit log records what happened,
in prose, for humans to read afterwards. The message table here carries structured
payloads that other modules consume and act on. The record is a by-product of the
mechanism, not a separate feature bolted alongside it.

---

## 4. System architecture

```
                    ┌─────────────────────────┐
                    │      React client       │
                    │  dashboard · purchases  │
                    │        · activity       │
                    └────────────┬────────────┘
                                 │  REST
                    ┌────────────┴────────────┐
                    │      Express API        │
                    └────────────┬────────────┘
                                 │
        ┌──────────┬─────────────┼─────────────┬──────────┐
        │          │             │             │          │
   ┌────┴────┐ ┌───┴──────┐ ┌────┴─────┐ ┌─────┴──────┐
   │ Budget  │ │Procure-  │ │ Projects │ │ Ticketing  │
   │         │ │  ment    │ │          │ │            │
   └────┬────┘ └───┬──────┘ └────┬─────┘ └─────┬──────┘
        │          │             │             │
        └──────────┴─────────────┴─────────────┘
                          │
             ┌────────────┴─────────────┐
             │      Message log         │
             │  publish → dispatch →    │
             │       handlers           │
             └──────────────────────────┘
                          │
                    MySQL 8 · Prisma
```

Modules communicate only downward into the message log and never sideways into each
other. The dashboard endpoint, which is the one place all four domains appear together,
composes each module's exported summary function rather than querying tables — the design
would leak here if anywhere, and it does not.

---

## 5. Technology

| Layer | Choice | Reason |
|---|---|---|
| MySQL 8 | Database | ACID guarantees and row-level locking, both needed for the budget check in section 7 |
| Prisma | ORM | Type-safe queries; the raw escape hatch is available where locking requires it |
| Node.js + Express | Backend | Straightforward module composition; no framework opinions to work around |
| React + TypeScript + Tailwind | Frontend | Same stack used in production on a previous project |
| Decimal(14,2) | Money | Floating point loses precision on currency; never appropriate for financial records |

The database choice is deliberately not load-bearing. Because modules communicate only
through messages, the persistence layer is an implementation detail of each module.
Migrating any single module to a different store is a contained change.

---

## 6. Domain model

Grouped by owning module. Cross-module references are plain string identifiers, never
foreign keys.

**Budget** — `BudgetLine` (allocated, committed, spent per project per fiscal year),
`Commitment`, `Expense`, `Income`. Available balance is always derived as
`allocated − committed − spent`, never stored, so it cannot drift.

**Procurement** — `Vendor`, `PurchaseRequest` (with status and decision reason).

**Projects** — `Project`, `Milestone`.

**Ticketing** — `TicketType`, `TicketSale`, `GalleryAvailability`.

**Shared** — `Message` (type, payload, created, processed, error).

The separation of *committed* from *spent* is the point of the budget model. Committed
money is promised but not yet paid, and treating it as available is the single most common
cause of budget overrun in project-based organisations.

---

## 7. Integration flows

### Flow A — a purchase request checked against project funds

| Step | Module | Action |
|---|---|---|
| 1 | Procurement | Receives `POST /api/purchase-requests`, creates a PENDING request |
| 2 | Procurement | Publishes `purchase.requested` in the same transaction |
| 3 | Budget | Handler picks it up, locks the budget line row |
| 4 | Budget | Computes available = allocated − committed − spent |
| 5 | Budget | If sufficient: creates a commitment, increases committed, publishes `budget.approved` |
| 6 | Budget | If not: publishes `budget.rejected` naming the shortfall |
| 7 | Procurement | Handler sets the request to APPROVED or REJECTED with the reason |
| 8 | Projects | On approval, advances the relevant milestone |

Later, when goods arrive, procurement publishes `goods.received` and the budget module
converts the commitment into actual spend.

Procurement never learns the balance. It learns the answer.

### Flow B — a project closure changes what visitors can buy

A project schedules a gallery closure and publishes `gallery.closed`. Ticketing marks that
gallery unavailable for the date range and refuses sales against it, recording which
project is responsible.

This flow is included because it proves the integration is not purely financial. A
decision made by the projects team automatically changes what the front desk can sell,
with no message passed between people.

### Message catalogue

| Message | Published by | Handled by | Effect |
|---|---|---|---|
| `purchase.requested` | Procurement | Budget | Triggers the availability check |
| `budget.approved` | Budget | Procurement, Projects | Request approved; milestone advances |
| `budget.rejected` | Budget | Procurement | Request rejected with a reason |
| `goods.received` | Procurement | Budget | Commitment becomes actual spend |
| `gallery.closed` | Projects | Ticketing | Gallery availability blocked |
| `ticket.sold` | Ticketing | Budget | Revenue posted to the income ledger |

---

## 8. Concurrency

Two purchase requests arriving against the same budget line at the same moment will both
read the same balance, both find sufficient funds, and both be approved. The organisation
overspends, and neither request is individually at fault.

MySQL's default isolation level is REPEATABLE READ, which means re-reading the balance
inside the transaction returns the same stale value. Re-checking does not help.

The budget handler therefore takes an exclusive row lock before reading:

```sql
SELECT id, allocated, committed, spent
FROM BudgetLine
WHERE projectCode = ? AND fiscalYear = ?
FOR UPDATE;
```

The second request waits until the first has committed its commitment record and released
the lock, then reads the updated balance and is correctly rejected if funds have run out.

This is a small amount of code and it is the difference between a demonstration and a
system that could handle money.

---

## 9. Failure handling

A message that fails during handling keeps `processedAt` null and records the error, so it
remains available for retry rather than being lost. Because the state change and its
message are written in the same database transaction, there is no case where a change
happens without its message, or vice versa.

Beyond the prototype, this would become: a dedicated worker polling with
`SELECT ... FOR UPDATE SKIP LOCKED` so multiple workers cannot process the same message;
a retry policy with backoff; a dead-letter table for messages that exhaust their retries;
and an operator view to inspect and replay them. All are noted as deliberate future work.

---

## 10. Scope

### Built

- Four modules with enforced boundaries, visible in the folder structure
- Message log with publish, dispatch and per-module handlers
- Flow A end to end, demonstrating both approval and rejection
- Flow B end to end
- Three screens: dashboard, purchase requests, activity log
- Seeded data representing a system already in use

### Deliberately not built

| Excluded | Reason |
|---|---|
| Authentication | A role switcher stands in. Auth is well understood and not what this task examines. |
| Payment gateway | Requires live merchant credentials and KYC approval. |
| Accounting software connector | Requires knowing which system Param runs and having API access. |
| Approval thresholds and chains | Requires Param's actual delegation-of-authority rules. |
| Email and messaging notifications | Plumbing rather than architecture. |
| Pagination, caching, rate limiting | Not meaningful at prototype data volumes. |

The second table matters as much as the first. Knowing what a complete system requires,
choosing what to build in the time available, and being able to say exactly what
information would be needed to finish, is the position this design is written from.

---

## 11. Roadmap

**Near term.** Replace the budget module's internal store with an adapter to whichever
accounting system Param runs, keeping the same message interface so no other module
changes. Add approval thresholds reflecting the real delegation of authority. Move the
dispatcher to a dedicated worker with a dead-letter queue and replay.

**Medium term.** Per-gallery cost and revenue reporting, which becomes possible once
project spend and ticket income share a spine. Vendor performance history. Maintenance
tickets from the gallery floor feeding into the same procurement and budget path as
planned work.

**Longer term.** Multi-centre views spanning ParSEC and future centres, with budgets rolled
up by centre and by programme. Condition monitoring on exhibits feeding maintenance
tickets automatically, so a failing component raises a request before it becomes a
closure.

---

## 12. Note on scope of the prototype

This prototype is intentionally small. It demonstrates one architectural argument
thoroughly rather than several features shallowly.

For reference on production work at a larger scale, the attached handover document for
**Printbot 3D** covers a full-stack application I built and documented for handover:
authentication and role-based access, file upload with in-browser 3D preview, an order
lifecycle with status-driven notifications, transactional email templates, a WhatsApp
integration, and a PostgreSQL migration with deployment and credential handover.

---

## 13. Running it

```bash
git clone <repository-url>
cd param-integration-prototype
npm install

docker run --name param-mysql -e MYSQL_ROOT_PASSWORD=dev \
  -e MYSQL_DATABASE=param_platform -p 3306:3306 -d mysql:8

cp .env.example .env
npx prisma db push
npx tsx prisma/seed.ts
npm run dev
```

Open `http://localhost:5173`. The activity screen shows the message log; raising a
purchase request on the purchases screen and watching the messages appear is the shortest
path to seeing the integration work.
