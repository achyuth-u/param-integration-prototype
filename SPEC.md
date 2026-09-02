# SPEC — Param Integration Prototype

The build specification this prototype was developed against. Written before any code, and
used as the reference throughout.

It covers four internal domains: procurement, project tracking, budget, and ticketing.

---

## What this is, in one line

**An internal staff tool. Full stack, but there is no public-facing side.**

Every person who uses this application works at the organisation. There is no visitor
signup, no customer account, no public ticket-buying page, no marketing homepage. The
ticketing module records sales and gallery availability *from the staff side* — it is a
back-office view of ticketing operations, not a booking website.

The application is the shape of an operations dashboard: sidebar navigation, three
data-dense pages, a role switcher in the header. Four notional users:

| Role | Cares about |
|---|---|
| Finance | Budget lines, commitments, spend, income |
| Procurement | Raising requests, vendors, approvals |
| Project lead | Milestones, project budget health, gallery closures |
| Operations | Ticket sales, which galleries are open |

All four see the same application; the role switcher only changes which actions are
offered. It is not access control and is not presented as such.

---

## 1. Architectural rules

These are load-bearing. Where a rule makes the code more awkward, the awkwardness is the
boundary doing its job.

1. **Four modules.** `src/modules/budget`, `src/modules/procurement`,
   `src/modules/projects`, `src/modules/ticketing`. Nothing else goes in `src/modules/`.

2. **No module imports from another module's folder.** Not a service, not a type, not a
   constant. Shared types live in `src/shared/types.ts`.

3. **No Prisma relations across module boundaries.** A `PurchaseRequest` referencing a
   project stores `projectCode String`, never `project Project @relation(...)`. Relations
   *within* a module are fine.

4. **No module queries another module's tables.** `procurement` may never call
   `prisma.budgetLine.findMany()`. If procurement needs to know about money, it writes a
   message and waits for the answer.

5. **All cross-module communication goes through the `Message` table.** No direct calls
   between modules. No shared service layer that reaches into both.

6. **All money is `Decimal @db.Decimal(14,2)`.** Never `Float`. `Prisma.Decimal` in code,
   serialised to string in API responses.

7. **MySQL 8.** No `String[]` scalar arrays — a `Json` column or a join table instead.

8. **No authentication.** A role switcher in the header that sets presentation state only.
   Deliberately out of scope.

9. **TypeScript strict mode on.** No `any` in module code.

---

## 2. Problem being solved

A science centre runs four functions that each hold correct data about themselves and
stale data about everything else:

| Function | Owns | Typically lives in |
|---|---|---|
| Budget | Allocations, commitments, spend, income | A finance spreadsheet or accounting software |
| Procurement | Vendors, purchase requests, purchase orders | Email threads and paper |
| Project tracking | Gallery and exhibit builds, milestones | A shared spreadsheet |
| Ticketing | Visitor sales, gallery availability | A counter system or vendor platform |

Symptoms:

- A purchase request is raised without anyone knowing whether the project still has money.
- Committed money is invisible: ₹6.4 lakh promised to a fabricator still shows as
  available, so a second purchase gets approved against money that is already spent.
- A gallery closes for a refresh and the ticket counter keeps selling access to it.
- Ticket income and project spend live in different files, so nobody can say what a gallery
  cost or what it earns.

Every one of these is currently fixed by a person messaging another person. The integration
layer is a human.

**The design response:** one application, four modules with hard walls, and a message log
in the middle. No module reads another module's tables. If procurement needs the budget
balance, it asks.

Full reasoning is in `SOLUTION_DESIGN.md`.

---

## 3. Stack

| Layer | Choice |
|---|---|
| Frontend | React, TypeScript, Vite, TailwindCSS, Recharts |
| Backend | Node.js, Express, TypeScript |
| ORM | Prisma 5 |
| Database | MySQL 8 |

---

## 4. Folder structure

The structure is part of the deliverable. It makes the boundaries obvious to someone who
reads nothing else.

```
param-integration-prototype/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── server.ts                  # express bootstrap + route mounting only, ~40 lines
│   ├── shared/
│   │   ├── prisma.ts              # single PrismaClient instance
│   │   ├── types.ts               # message payload types
│   │   ├── dashboard.ts           # composes each module's getSummary(); never queries tables
│   │   └── messages/
│   │       ├── publish.ts         # write a message row
│   │       ├── dispatch.ts        # read unprocessed messages, route to handlers
│   │       └── registry.ts        # maps message type -> handler functions
│   └── modules/
│       ├── budget/                # routes, service, handlers
│       ├── procurement/
│       ├── projects/
│       └── ticketing/
├── client/                        # separate Vite React app, own package.json
│   ├── vite.config.ts             # proxies /api -> http://localhost:3001
│   └── src/
│       ├── App.tsx                # router + sidebar layout + role switcher
│       ├── index.css              # tailwind import + CSS variables
│       └── pages/
│           ├── Dashboard.tsx
│           ├── PurchaseRequests.tsx
│           └── Activity.tsx
├── SPEC.md
├── SOLUTION_DESIGN.md
├── .env.example
└── README.md
```

Two dev servers run side by side: Express on 3001, Vite on 5173, with Vite proxying `/api`
to the backend.

---

## 5. Database schema

Grouped by owning module. Cross-module references are plain strings.

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

### Budget

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
  source     String   @db.VarChar(64)
  amount     Decimal  @db.Decimal(14,2)
  receivedAt DateTime @default(now())
}
```

**Available balance is derived, never stored:** `allocated - committed - spent`.

### Procurement

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

### Projects

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

### Ticketing

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

## 6. Message catalogue

| # | Type | Published by | Handled by | Effect |
|---|---|---|---|---|
| 1 | `purchase.requested` | procurement | budget | Triggers an availability check |
| 2 | `budget.approved` | budget | procurement, projects | PR → APPROVED; milestone → IN_PROGRESS |
| 3 | `budget.rejected` | budget | procurement | PR → REJECTED with a reason |
| 4 | `goods.received` | procurement | budget | Commitment converts to actual spend |
| 5 | `gallery.closed` | projects | ticketing | Gallery marked unavailable for the date range |
| 6 | `ticket.sold` | ticketing | budget | Revenue posted to the income ledger |

Payload shapes, in `src/shared/types.ts`:

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

## 7. The message layer

`publish.ts` — inserts a `Message` row. Accepts an optional Prisma transaction client so
the message is written in the same transaction as the state change that caused it.

`registry.ts` — maps message type to an array of `{ module, handler }` pairs. Each module
registers its handlers at startup. This is the only file permitted to import from more than
one module.

`dispatch.ts` — selects messages where `processedAt IS NULL` ordered by id, runs each
registered handler, and on success sets `processedAt` along with the names of the modules
that handled it. On failure it records the error and leaves `processedAt` null so the
message can be retried.

`dispatch()` runs after every write endpoint, and on a two-second interval as a safety net.

In production this would be a separate worker polling with
`SELECT ... FOR UPDATE SKIP LOCKED` so multiple workers cannot process the same row. Noted
as future work, not built here.

---

## 8. The two flows

### Flow A — purchase request against a project budget

1. `POST /api/purchase-requests` with `{ projectCode, vendorId, description, amount }`
2. Procurement inserts a `PurchaseRequest` with status `PENDING`
3. **In the same transaction**, procurement publishes `purchase.requested`
4. The dispatcher routes it to the budget handler
5. Budget opens a transaction and locks the row:
   `SELECT id, allocated, committed, spent FROM BudgetLine WHERE projectCode = ? AND fiscalYear = ? FOR UPDATE`
   via `$queryRaw` inside `prisma.$transaction`
6. Budget computes `available = allocated - committed - spent`
7. If `available >= amount`: insert a `Commitment`, increase `committed`, publish
   `budget.approved`
8. If not: publish `budget.rejected` with a reason naming the shortfall
9. Commit the transaction, releasing the lock
10. Procurement's handler sets the PR to `APPROVED` or `REJECTED` with the reason
11. Projects' handler advances the relevant milestone on approval
12. The activity screen shows every message that flowed

**Why the row lock.** Two requests hitting the same budget line simultaneously would both
read the same balance, both see enough money, and both be approved. MySQL defaults to
REPEATABLE READ, so re-reading inside the transaction does not help. `FOR UPDATE` makes the
second request wait.

Then `POST /api/purchase-requests/:id/receive-goods` publishes `goods.received`, and the
budget handler converts the commitment into an expense: `committed -= amount`,
`spent += amount`, commitment status `CONVERTED`.

### Flow B — a project closure changes what visitors can buy

1. `POST /api/projects/:code/close-gallery` with `{ from, to }`
2. Projects updates the project and publishes `gallery.closed`
3. Ticketing's handler sets `GalleryAvailability.isOpen = false` for that gallery and
   records the date range and the responsible project
4. `POST /api/ticketing/sales` for a closed gallery returns 409 with a clear reason

---

## 9. API endpoints

| Method | Path | Module | Purpose |
|---|---|---|---|
| GET | `/api/dashboard` | shared | Cross-module summary (see note) |
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

**On `/api/dashboard`:** this is the one place data from all four modules appears together,
and it must not break rule 4. It lives in `src/shared/dashboard.ts` and calls each module's
exported `getSummary()`, combining the results. It never queries tables directly.

---

## 10. Screens

Three pages, sidebar navigation, role switcher in the header. Dark interface, one accent
colour, monospace for numbers and identifiers, colour used only for status and message type.

### Dashboard
- Four metric cards: total allocated, total committed, total spent, ticket revenue
- Horizontal stacked bars per project: spent, committed, available
- Donut of purchase requests by status
- Ticket revenue over the last 14 days
- Gallery availability, with closed galleries showing the project that closed them
- Project milestone progress

### Purchase requests
- Table: PR number, project, vendor, amount, status pill, decision reason
- Rejected rows show the reason inline — this is the detail that proves the budget module
  actually answered
- "New request" form; on submit the list polls so the status visibly changes from PENDING
- "Mark goods received" button on approved rows

### Activity
- The message log, newest first
- Each row: type as a pill, relative time, publishing module → handling modules, expandable
  JSON payload, processed indicator
- Auto-refresh every two seconds

**The activity screen is the most important one.** It is what makes an invisible
architecture visible.

---

## 11. Seed data

The system must look used, not empty.

- **3 projects**, four milestones each at mixed statuses
- **3 budget lines**, FY 2026-27, with commitments and expenses already recorded so the
  bars are partly filled
- **5 vendors** across fabrication, AV, hardware, services
- **8 purchase requests** across all four statuses, including one rejected with a shortfall
  reason
- **3 ticket types** and roughly 40 sales over the last 14 days
- **4 galleries**, one already closed by a project
- **Backdated `Message` rows** for every seeded event, so the activity feed is populated on
  first load

That last point matters more than it sounds. An empty activity feed makes the central idea
invisible.

---

## 12. Explicitly out of scope

| Cut | Reason |
|---|---|
| Authentication | Role switcher instead; not what this task tests |
| Payment gateway | Requires live merchant credentials and KYC |
| Accounting software integration | Requires knowing which system is in use and having API access |
| Approval chains by rupee threshold | Requires the organisation's delegation-of-authority rules |
| Email / messaging notifications | Plumbing, not architecture |
| Pagination, caching, rate limiting | Not meaningful at prototype data volumes |
| Deployment | Runs locally; setup documented in the README |

---

## 13. Build order

Each step working before the next began.

1. `schema.prisma`, `db push`, `seed.ts`
2. `src/shared/` — prisma client, types, publish, registry, dispatch
3. Budget module: `getSummary()`, the `purchase.requested` handler with the row lock
4. Procurement module: create endpoint, `budget.approved` / `budget.rejected` handlers
5. **Flow A tested end to end through the API, both paths, before any UI**
6. Projects and ticketing modules, Flow B
7. Express wiring, remaining read endpoints, composed dashboard endpoint
8. Boundary audit — no cross-module imports, no cross-module table queries
9. React: Activity page first, then Purchase requests, then Dashboard
10. Documentation
