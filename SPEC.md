# SPEC.md — Param Integration Prototype

**Read this file completely before writing any code.**

This is the build specification for a prototype demonstrating integration across four
internal domains: procurement, project tracking, budget, and ticketing.

A second file, `printbot_handover.md`, is attached as a **style reference only**. Use it
to match the React/Tailwind conventions, folder habits, and general code style. Do **not**
copy its architecture — specifically, do not put the whole backend in one `server.ts`.
That single-file pattern is the thing this project is deliberately built to avoid.

---

## What this is, in one line

**An internal staff tool. Full stack, but there is no public-facing side.**

Every person who uses this application works at the organisation. There is no visitor
signup, no customer account, no public ticket-buying page, no marketing homepage, no
landing page. The ticketing module records sales and gallery availability *from the staff
side* — it is a back-office view of ticketing operations, not a booking website.

If a screen is something a museum visitor would see, it does not belong in this project.

The whole application is roughly the shape of an admin dashboard: sidebar navigation,
three or four data-dense pages, a role switcher in the header. Four notional users:

| Role | Cares about |
|---|---|
| Finance | Budget lines, commitments, spend, income |
| Procurement | Raising requests, vendors, approvals |
| Project lead | Milestones, project budget health, gallery closures |
| Operations | Ticket sales, which galleries are open |

All four see the same application; the role switcher only changes which actions are
offered. It is not access control and is not presented as such.

---

## 0. Non-negotiable rules

These come first because they are the ones most likely to be quietly broken. Every rule
below is load-bearing. If a rule seems to make the code more awkward, that is expected —
the awkwardness is the boundary doing its job.

1. **Four modules.** `src/modules/budget`, `src/modules/procurement`, `src/modules/projects`,
   `src/modules/ticketing`. Nothing else goes in `src/modules/`.

2. **No module imports from another module's folder.** Not a service, not a type, not a
   constant. If two modules need the same type, it goes in `src/shared/types.ts`.

3. **No Prisma relations across module boundaries.** A `PurchaseRequest` referencing a
   project stores `projectCode String`, never `project Project @relation(...)`. Relations
   *within* a module are fine and encouraged.

4. **No module queries another module's tables.** `procurement` may never call
   `prisma.budgetLine.findMany()`. If procurement needs to know about money, it writes a
   message and waits for the answer.

5. **All cross-module communication goes through the `Message` table.** No direct function
   calls between modules. No shared service layer that reaches into both.

6. **All money is `Decimal @db.Decimal(14,2)`.** Never `Float`. Never `Int` paise.
   Use `Prisma.Decimal` in code, and serialise to string in API responses.

7. **MySQL 8, not PostgreSQL.** No `String[]` scalar arrays (MySQL doesn't support them).
   Use a `Json` column or a join table instead.

8. **No authentication.** A role switcher in the UI header (Finance / Procurement /
   Project Lead / Operations) that sets a header value. Deliberately out of scope.

9. **TypeScript strict mode on.** No `any` in module code.

---

## 1. What is being built and why

### The problem

A science centre runs four functions that each hold correct data about themselves and
stale data about everything else:

| Function | Owns | Typically lives in |
|---|---|---|
| Budget | Allocations, commitments, spend, income | A finance spreadsheet or accounting software |
| Procurement | Vendors, purchase requests, purchase orders | Email threads and paper |
| Project tracking | Gallery and exhibit builds, milestones | A shared spreadsheet |
| Ticketing | Visitor sales, gallery availability | A counter system or vendor platform |

Symptoms this produces:

- A purchase request is raised without anyone knowing whether the project still has money.
- Committed money is invisible: ₹6.4 lakh promised to a fabricator still shows as
  available, so a second purchase gets approved against money that is already spent.
- A gallery closes for a refresh and the ticket counter keeps selling access to it.
- Ticket income and project spend live in different files, so nobody can say what a
  gallery cost or what it earns.

Every one of these is currently fixed by a person messaging another person. The
integration layer is a human.

### The solution

One application, four modules with hard walls between them, and a message log in the
middle. Modules stay independent; changes propagate automatically.

**The rule that defines the design:** no module reads another module's tables. If
procurement needs the budget balance, it has to ask. It cannot look.

**Why this matters:** if procurement could read budget tables directly, then the day the
organisation adopts real accounting software, every procurement query breaks. With the
wall in place, the budget module is replaced and nothing else changes, because everything
else only ever spoke to it through messages.

**Why a modular monolith rather than microservices:** a small team cannot operate four
deployments, four log streams, four failure modes. One app with four sealed modules gives
the boundary benefit at a fraction of the operational cost, and any module can be lifted
into its own service later without touching the others.

**Why messages rather than direct calls:** three reasons. Modules stay replaceable. Every
cross-domain change leaves a permanent record, which for an organisation handling grant
money is an audit trail. And a failed handler leaves the message in place to be retried.

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19, TypeScript, Vite, TailwindCSS |
| Backend | Node.js, Express, TypeScript |
| ORM | Prisma 5 |
| Database | MySQL 8 |
| Charts | Recharts (dashboard only, optional) |

Local MySQL via Docker:

```bash
docker run --name param-mysql -e MYSQL_ROOT_PASSWORD=dev \
  -e MYSQL_DATABASE=param_platform -p 3306:3306 -d mysql:8
```

`.env`:

```
DATABASE_URL="mysql://root:dev@localhost:3306/param_platform"
PORT=3001
```

---

## 3. Folder structure

The structure is part of the deliverable. It should make the boundaries obvious to
someone who reads nothing else.

```
param-integration-prototype/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── server.ts                  # express bootstrap + route mounting ONLY, ~40 lines
│   ├── shared/
│   │   ├── prisma.ts              # single PrismaClient instance
│   │   ├── types.ts               # message payload types, shared enums
│   │   └── messages/
│   │       ├── publish.ts         # write a message row
│   │       ├── dispatch.ts        # read unprocessed messages, route to handlers
│   │       └── registry.ts        # maps message type -> handler functions
│   ├── modules/
│   │   ├── budget/
│   │   │   ├── routes.ts
│   │   │   ├── service.ts
│   │   │   └── handlers.ts        # reacts to purchase.requested, goods.received, ticket.sold
│   │   ├── procurement/
│   │   │   ├── routes.ts
│   │   │   ├── service.ts
│   │   │   └── handlers.ts        # reacts to budget.approved, budget.rejected
│   │   ├── projects/
│   │   │   ├── routes.ts
│   │   │   ├── service.ts
│   │   │   └── handlers.ts        # reacts to budget.approved
│   │   └── ticketing/
│   │       ├── routes.ts
│   │       ├── service.ts
│   │       └── handlers.ts        # reacts to gallery.closed
│   └── shared/dashboard.ts        # composes each module's getSummary(); never queries tables
├── client/                        # separate Vite React app, own package.json
│   ├── vite.config.ts             # proxies /api -> http://localhost:3001
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx                # router + sidebar layout + role switcher
│       ├── index.css              # @import "tailwindcss";
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   ├── PurchaseRequests.tsx
│       │   └── Activity.tsx
│       └── components/
├── SPEC.md
├── SOLUTION_DESIGN.md
├── printbot_handover.md
├── .env.example
└── README.md
```

**Note on the client:** it is a separate Vite project with its own `package.json` and
`tsconfig.json`, not part of the backend TypeScript build. The root `tsconfig.json`
excludes it. Two dev servers run side by side: Express on 3001, Vite on 5173, with Vite
proxying `/api` to the backend.

---

## 4. Database schema

Grouped by owning module. Cross-module references are plain strings, marked below.

### Shared

```prisma
model Message {
  id          BigInt    @id @default(autoincrement())
  type        String    @db.VarChar(64)
  payload     Json
  createdAt   DateTime  @default(now())
  processedAt DateTime?
  processedBy String?   @db.VarChar(64)
  error       String?   @db.Text

  @@index([processedAt, id])
  @@index([type])
}
```

### Budget module

```prisma
model BudgetLine {
  id          String   @id @default(cuid())
  projectCode String   @db.VarChar(32)   // cross-module reference, NOT a relation
  fiscalYear  String   @db.VarChar(16)
  allocated   Decimal  @db.Decimal(14,2)
  committed   Decimal  @db.Decimal(14,2) @default(0)
  spent       Decimal  @db.Decimal(14,2) @default(0)
  commitments Commitment[]
  expenses    Expense[]

  @@unique([projectCode, fiscalYear])
}

model Commitment {
  id           String     @id @default(cuid())
  budgetLineId String
  budgetLine   BudgetLine @relation(fields: [budgetLineId], references: [id])
  sourceRef    String     @db.VarChar(64)   // the PR number that caused it
  amount       Decimal    @db.Decimal(14,2)
  status       String     @db.VarChar(16)   // ACTIVE | CONVERTED | RELEASED
  createdAt    DateTime   @default(now())
}

model Expense {
  id           String     @id @default(cuid())
  budgetLineId String
  budgetLine   BudgetLine @relation(fields: [budgetLineId], references: [id])
  sourceRef    String     @db.VarChar(64)
  amount       Decimal    @db.Decimal(14,2)
  bookedAt     DateTime   @default(now())
}

model Income {
  id         String   @id @default(cuid())
  source     String   @db.VarChar(64)   // "ticketing"
  amount     Decimal  @db.Decimal(14,2)
  receivedAt DateTime @default(now())
}
```

**Available balance is derived, never stored:** `allocated - committed - spent`.

### Procurement module

```prisma
model Vendor {
  id       String  @id @default(cuid())
  name     String  @db.VarChar(128)
  category String  @db.VarChar(64)      // Fabrication | AV | Hardware | Services
  requests PurchaseRequest[]
}

model PurchaseRequest {
  id              String    @id @default(cuid())
  prNumber        String    @unique @db.VarChar(32)
  projectCode     String    @db.VarChar(32)   // cross-module reference
  vendorId        String
  vendor          Vendor    @relation(fields: [vendorId], references: [id])
  description     String    @db.VarChar(255)
  amount          Decimal   @db.Decimal(14,2)
  status          String    @db.VarChar(16)   // PENDING | APPROVED | REJECTED | RECEIVED
  decisionReason  String?   @db.VarChar(255)
  createdAt       DateTime  @default(now())
  decidedAt       DateTime?
  receivedAt      DateTime?
}
```

### Projects module

```prisma
model Project {
  id          String   @id @default(cuid())
  code        String   @unique @db.VarChar(32)
  name        String   @db.VarChar(128)
  galleryCode String   @db.VarChar(32)
  status      String   @db.VarChar(24)   // PLANNING | IN_PROGRESS | COMPLETE
  startDate   DateTime
  targetDate  DateTime
  milestones  Milestone[]
}

model Milestone {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id])
  title     String   @db.VarChar(128)
  sequence  Int
  status    String   @db.VarChar(24)   // NOT_STARTED | IN_PROGRESS | DONE
}
```

### Ticketing module

```prisma
model TicketType {
  id    String  @id @default(cuid())
  name  String  @db.VarChar(64)        // General | Student | School group
  price Decimal @db.Decimal(14,2)
  sales TicketSale[]
}

model TicketSale {
  id           String     @id @default(cuid())
  ticketTypeId String
  ticketType   TicketType @relation(fields: [ticketTypeId], references: [id])
  quantity     Int
  amount       Decimal    @db.Decimal(14,2)
  soldAt       DateTime   @default(now())
}

model GalleryAvailability {
  id          String    @id @default(cuid())
  galleryCode String    @unique @db.VarChar(32)
  name        String    @db.VarChar(128)
  isOpen      Boolean   @default(true)
  closedFrom  DateTime?
  closedTo    DateTime?
  closedFor   String?   @db.VarChar(64)   // project code, cross-module reference
}
```

---

## 5. The message catalogue

Six messages. Do not add more without a reason.

| # | Type | Written by | Handled by | Effect |
|---|---|---|---|---|
| 1 | `purchase.requested` | procurement | budget | Triggers an availability check |
| 2 | `budget.approved` | budget | procurement, projects | PR → APPROVED; milestone → IN_PROGRESS |
| 3 | `budget.rejected` | budget | procurement | PR → REJECTED with a reason |
| 4 | `goods.received` | procurement | budget | Commitment converts to actual spend |
| 5 | `gallery.closed` | projects | ticketing | Gallery marked unavailable for the date range |
| 6 | `ticket.sold` | ticketing | budget | Revenue posted to the income ledger |

Payload shapes go in `src/shared/types.ts`:

```ts
export type MessagePayloads = {
  'purchase.requested': { prNumber: string; projectCode: string; amount: string };
  'budget.approved':    { prNumber: string; projectCode: string; amount: string; commitmentId: string };
  'budget.rejected':    { prNumber: string; projectCode: string; amount: string; reason: string };
  'goods.received':     { prNumber: string; projectCode: string; amount: string };
  'gallery.closed':     { galleryCode: string; projectCode: string; from: string; to: string };
  'ticket.sold':        { amount: string; quantity: number; ticketTypeName: string };
};
```

---

## 6. The dispatcher

`src/shared/messages/publish.ts` — inserts a `Message` row. Must accept an optional
Prisma transaction client so the message can be written in the same transaction as the
state change that caused it.

`src/shared/messages/registry.ts` — a plain map from message type to an array of handler
functions. Each module registers its handlers here at startup. This is the **only** file
allowed to import from more than one module.

`src/shared/messages/dispatch.ts` — selects messages where `processedAt IS NULL`, ordered
by id, and runs each registered handler. On success, sets `processedAt`. On failure,
records the error and leaves `processedAt` null so it can be retried.

Call `dispatch()` after every write endpoint, and also on a `setInterval` of 2 seconds as
a safety net. Keep it under about 60 lines.

**Note for the README, not for the code:** in production this would be a separate worker
polling with `SELECT ... FOR UPDATE SKIP LOCKED` so multiple workers don't process the
same row, and the message table would be swapped for a real queue. Both are noted as
future work, not built here.

---

## 7. The two flows

### Flow A — purchase request against a project budget

This is the primary flow and the one demonstrated in the video. Build it first and get it
working end to end before writing any UI.

1. `POST /api/purchase-requests` with `{ projectCode, vendorId, description, amount }`
2. Procurement inserts a `PurchaseRequest` with status `PENDING`
3. **In the same transaction**, procurement publishes `purchase.requested`
4. Dispatcher routes it to the budget handler
5. Budget opens a transaction and locks the row:
   `SELECT * FROM BudgetLine WHERE projectCode = ? AND fiscalYear = ? FOR UPDATE`
   (use `prisma.$queryRaw` inside `prisma.$transaction`)
6. Budget computes `available = allocated - committed - spent`
7. If `available >= amount`: insert a `Commitment`, increase `committed`, publish
   `budget.approved`
8. If not: publish `budget.rejected` with a reason naming the shortfall
9. Commit the transaction, releasing the lock
10. Procurement's handler sets the PR to `APPROVED` or `REJECTED`
11. Projects' handler moves the relevant milestone to `IN_PROGRESS` on approval
12. The activity screen shows all messages that just flowed

**Why the row lock is there** (say this in the README and in the interview): two requests
hitting the same budget line simultaneously would both read the same balance, both see
enough money, and both be approved. The organisation overspends. MySQL defaults to
REPEATABLE READ, so re-reading inside the transaction does not help. `FOR UPDATE` makes
the second request wait for the first to finish. Three words of SQL, and it is the
difference between a demo and a system.

Then `POST /api/purchase-requests/:id/receive-goods` publishes `goods.received`, and the
budget handler converts the commitment into an expense: `committed -= amount`,
`spent += amount`, commitment status `CONVERTED`.

### Flow B — a project closure changes what visitors can buy

Smaller, but it is the flow that proves the integration is not just a finance trick.

1. `POST /api/projects/:code/close-gallery` with `{ from, to }`
2. Projects updates the project and publishes `gallery.closed`
3. Ticketing's handler sets `GalleryAvailability.isOpen = false` for that gallery and
   records the date range and the project responsible
4. `POST /api/ticketing/sales` for a closed gallery returns 409 with a clear reason

---

## 8. API endpoints

| Method | Path | Module | Purpose |
|---|---|---|---|
| GET | `/api/dashboard` | aggregate | Cross-module summary (see note below) |
| GET | `/api/projects` | projects | List with milestones |
| POST | `/api/projects/:code/close-gallery` | projects | Schedule a closure |
| GET | `/api/budget` | budget | Budget lines with allocated/committed/spent/available |
| GET | `/api/purchase-requests` | procurement | List with vendor and status |
| POST | `/api/purchase-requests` | procurement | Raise a request (Flow A) |
| POST | `/api/purchase-requests/:id/receive-goods` | procurement | Record delivery |
| GET | `/api/vendors` | procurement | For the request form dropdown |
| GET | `/api/ticketing` | ticketing | Sales summary and gallery availability |
| POST | `/api/ticketing/sales` | ticketing | Log a sale |
| GET | `/api/messages` | shared | Activity feed, newest first, limit 50 |

**On `/api/dashboard`:** this is the one place data from all four modules appears
together, and it must not break rule 4. Implement it in `src/shared/dashboard.ts` by
calling each module's exported read function (`budget.getSummary()`,
`projects.getSummary()`, and so on) and combining the results. It never queries tables
directly. Note this explicitly in a code comment — it is the obvious place for the design
to leak, and showing it did not leak is worth pointing out.

---

## 9. Screens

Three pages, sidebar navigation, role switcher in the header. Match the Printbot visual
conventions: clean cards, generous spacing, one accent colour.

### Dashboard
- Four metric cards: total allocated, total committed, total spent, ticket revenue
- Per-project budget bars showing allocated / committed / spent / available
- Gallery availability strip (open galleries in normal state, closed ones muted with the
  project name that closed them)
- Recent activity: the last five messages

### Purchase requests
- Table: PR number, project, vendor, amount, status, reason
- Status as a coloured pill. Rejected rows show the reason inline — this is the detail
  that proves the budget module actually answered.
- "New request" form: project, vendor, description, amount. On submit, refetch and let the
  status appear.
- "Mark goods received" button on approved rows

### Activity
- The message log, newest first
- Each row: type as a pill, time, from-module → to-module, expandable JSON payload
- Processed / unprocessed indicator
- Auto-refresh every 2 seconds

**The activity screen is the most important one.** It is what makes an invisible
architecture visible to a reviewer in five seconds. Do not cut it.

---

## 10. Seed data

The system must look used, not empty. Generate:

- **3 projects**, each with 4 milestones at mixed statuses. Generic descriptive names:
  "Gallery refresh — ocean systems", "AV upgrade — main atrium",
  "New exhibit build — energy". No invented proper nouns.
- **3 budget lines**, FY 2026-27: ₹18,00,000 / ₹7,50,000 / ₹24,00,000 allocated, with
  some commitments and expenses already recorded so the bars are partly filled.
- **5 vendors** across fabrication, AV, hardware, services.
- **8 purchase requests**: 4 approved and received, 2 approved and pending delivery,
  1 rejected with a shortfall reason, 1 pending.
- **3 ticket types**: General ₹500, Student ₹250, School group ₹150.
- **~40 ticket sales** spread over the last 14 days.
- **4 galleries**, one already closed by a project.
- **Matching `Message` rows** for every seeded event, backdated, so the activity feed is
  populated on first load rather than empty.

That last point is easy to forget and it matters more than it sounds. An empty activity
feed makes the central idea invisible.

---

## 11. Explicitly out of scope

State these in the README. Naming what was cut, and why, reads as judgement. Silently
omitting things reads as incompleteness.

| Cut | Reason |
|---|---|
| Authentication | Role switcher instead; auth is well-understood and not what this task tests |
| Payment gateway | Requires live merchant credentials and KYC |
| Accounting software integration | Requires knowing which system is in use and having API access |
| Approval chains by rupee threshold | Requires the organisation's actual delegation-of-authority rules |
| Email / WhatsApp notifications | Plumbing, not architecture |
| Pagination, caching, rate limiting | Not meaningful at prototype data volumes |
| Deployment | Runs locally; setup documented in the README |

---

## 12. Build order

Do not deviate. Each step should work before the next begins.

1. `schema.prisma`, `npx prisma db push`, `seed.ts`, `npx tsx prisma/seed.ts`
2. `src/shared/` — prisma client, types, publish, registry, dispatch
3. Budget module: `getSummary()`, the `purchase.requested` handler with the row lock
4. Procurement module: create PR endpoint, `budget.approved` / `budget.rejected` handlers
5. **Test Flow A with curl. Both paths. Do not proceed until this works.**
6. Projects and ticketing modules, Flow B
7. Express wiring, all read endpoints
8. React: Activity page first, then Purchase requests, then Dashboard
9. README

---

## 13. README contents

Written last, but it carries roughly half the weight of the submission for a role with
"Architect" in the title.

1. **Problem** — the silo symptoms from section 1
2. **Approach** — modular monolith, the no-reading-each-other's-tables rule, and why
3. **Architecture diagram** — four modules, message log, activity view
4. **Message catalogue** — the table from section 5
5. **Flow walkthrough** — the twelve steps of Flow A
6. **Concurrency** — the row lock and why it is needed
7. **Failure handling** — unprocessed messages remain for retry; production would use a
   worker with `SKIP LOCKED` and a dead-letter table
8. **Out of scope** — the table from section 11
9. **What I'd build next** — real accounting connector, approval thresholds, dead-letter
   queue and replay, per-gallery cost-and-revenue reporting
10. **Setup** — clone, docker run, db push, seed, dev

Add near the top: *"Sample data is illustrative. The interpretation of the four domains is
based on the role description and the general nature of a science centre's operations, and
would be validated with the operations team."*

---

## 14. Prompts for the agent

Give one at a time. Read the output before moving on. After each, re-state rule 2 and
rule 3 — agents drift toward wiring modules together because it looks tidier, and that
quietly deletes the entire architecture.

1. "Read SPEC.md. Generate `prisma/schema.prisma` exactly as specified in section 4. MySQL 8.
   All money as Decimal(14,2). No relations across module boundaries — cross-module
   references are plain String fields."
2. "Generate `prisma/seed.ts` per section 10, including backdated Message rows."
3. "Generate `src/shared/messages/` — publish, registry, dispatch — per section 6. Keep
   dispatch under 60 lines."
4. "Generate `src/modules/budget/` per sections 4, 5 and 7. The `purchase.requested`
   handler must lock the budget line with a raw `SELECT ... FOR UPDATE` inside a Prisma
   transaction."
5. "Generate `src/modules/procurement/`. It must not import from any other module folder
   and must not query budget tables."
6. …and so on, one module at a time.
