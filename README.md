# Param Integration Prototype

A prototype integrating four internal domains — budget, procurement, project tracking and
ticketing — for a science centre's operations.

The four domains are kept strictly independent. No module reads another module's tables. If
procurement needs to know whether a project has funds, it publishes a message and waits for
the budget module to answer. Every piece of information that crosses a module boundary
travels through a shared message log.

For the architectural argument, the alternatives considered, and what was deliberately left
out, see the [Solution Design](./SOLUTION_DESIGN.md). The build specification the prototype
was developed against is in [SPEC.md](./SPEC.md).

---

## Setup

**1. Clone and install**

```bash
git clone https://github.com/achyuth-u/param-integration-prototype.git
cd param-integration-prototype
npm install
cd client && npm install && cd ..
```

**2. Database**

Requires MySQL 8 running locally. Create the database:

```sql
CREATE DATABASE param_platform CHARACTER SET utf8mb4;
```

**3. Environment**

Copy the example file and set your MySQL password in `DATABASE_URL`:

```bash
copy .env.example .env      # Windows
cp .env.example .env        # macOS / Linux
```

**4. Schema and seed data**

```bash
npx prisma db push
npx prisma generate
npm run seed
```

The seed populates three projects, three budget lines, five vendors, eight purchase
requests across all statuses, two weeks of ticket sales, four galleries, and backdated
message rows so the activity feed is populated on first load.

**5. Run**

Two terminals:

```bash
# Terminal 1 — backend, port 3001
npm run dev

# Terminal 2 — frontend, port 5173
cd client
npm run dev
```

Open `http://localhost:5173`.

Requires Node 22. Node 24 is not supported by Prisma 5.

---

## Seeing the integration in 60 seconds

**1. Dashboard.** Aggregations across all four modules, with no direct cross-domain
database query — the dashboard endpoint composes each module's exported `getSummary()`
rather than reading tables.

**2. Raise a request that fits.** Purchase Requests → New request → project `PROJ-OCN`,
amount `120000`. It appears as `PENDING`, because procurement genuinely does not know
whether funds exist. Within a couple of seconds it becomes `APPROVED` — the budget module
picked up the message, locked the budget line, checked the balance, reserved the money, and
answered.

**3. Raise one that does not fit.** Same project, amount `9000000`. It becomes `REJECTED`
with a reason naming the available balance and the shortfall. That reason came from the
budget module, not from a validation rule in the form.

**4. Activity.** Every cross-module message, newest first, showing the publishing module
and the modules that handled it — `procurement → budget`, `budget → procurement,projects`.
Expand any row to see the payload.

**5. Mark goods received** on the approved request. The commitment converts to actual
spend: committed drops, spent rises, available is unchanged.

---

## Folder structure

The backend is divided into four sealed modules. No module imports from another module's
folder, and no module queries another module's tables. All cross-module communication goes
through the `Message` table.

```
src/
├── modules/
│   ├── budget/         # budget lines, commitments, expenses, income
│   ├── procurement/    # vendors and purchase requests
│   ├── projects/       # projects, milestones, gallery closures
│   └── ticketing/      # ticket sales and gallery availability
├── shared/
│   ├── messages/       # publish, registry, dispatch
│   ├── dashboard.ts    # composes each module's getSummary(); never queries tables
│   ├── prisma.ts       # single Prisma client
│   └── types.ts        # message payload types
└── server.ts           # express bootstrap, route mounting, dispatch interval

client/
└── src/pages/          # Dashboard, PurchaseRequests, Activity
```

---

## Stack

React, TypeScript, Vite, Tailwind and Recharts on the frontend. Node, Express, TypeScript,
Prisma 5 and MySQL 8 on the backend.

---

*Sample data is illustrative. The interpretation of the four domains is based on the role
description and the general nature of a science centre's operations, and would be validated
with the operations team.*
