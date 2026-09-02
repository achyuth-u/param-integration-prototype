# PARAM Integration Prototype

This is a prototype demonstrating a highly decoupled, asynchronous integration architecture for four internal domains — budget, procurement, project tracking and ticketing — for a science centre's operations. It proves how they can communicate robustly and reliably without tight coupling or distributed transactions, relying entirely on asynchronous messaging and a unified UI shell.

For the full architectural argument, tradeoffs, and design decisions, please read the [Solution Design](./SOLUTION_DESIGN.md).

## Setup

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/achyuth-u/param-integration-prototype.git
   cd param-integration-prototype
   npm install
   cd client && npm install && cd ..
   ```

2. **Database**
   Ensure you have MySQL 8 running locally. Create a database for the prototype:
   ```sql
   CREATE DATABASE param_platform;
   ```

3. **Environment setup**
   Copy the example environment file and adjust the database URL if necessary:
   ```bash
   cp .env.example .env
   ```

4. **Initialize schema and data**
   Push the schema to your database and run the seed script to populate initial data and historical activity:
   ```bash
   npx prisma db push
   npx prisma generate
   npm run seed
   ```

5. **Run the application**
   You need to start both the backend server and the frontend client. Run these in separate terminal windows:
   ```bash
   # Terminal 1 (Backend)
   npm run dev

   # Terminal 2 (Frontend)
   cd client
   npm run dev
   ```
   Access the application at `http://localhost:5173`.

## See the Integration in 60 Seconds

To see the modules communicating in action:

1. **Open the Dashboard**: Navigate to the Dashboard. You'll see real-time aggregations across all modules without a single direct cross-domain database query — the dashboard endpoint composes each module's exported `getSummary()` function rather than querying tables.
2. **Raise a successful request**: Go to **Purchase Requests** and click "New request". Select `PROJ-OCN` and request an amount of `1,20,000`. You will see it appear as `PENDING`. Wait ~2 seconds for the background dispatcher to run, and it will update to `APPROVED`.
3. **Raise a failing request**: Create another request for `PROJ-OCN` but this time for `90,00,000`. Wait ~2 seconds, and it will update to `REJECTED` with a clear reason explaining the budget shortfall.
4. **Check the Activity Feed**: Navigate to the **Activity** page. You will see a chronological feed of all cross-module communication. Notice how the `purchase.requested` event published by the Procurement module was received and handled by the Budget module, leading to either a `budget.approved` or `budget.rejected` response.

## Folder Structure

The backend is strictly divided into bounded contexts. No module imports from any other module's folder. All cross-module communication happens via the `Message` table.

```
src/
├── modules/
│   ├── budget/         # Manages project budgets and commitments
│   ├── procurement/    # Manages vendors and purchase requests
│   ├── projects/       # Manages project milestones and gallery closures
│   └── ticketing/      # Manages gallery availability and ticket sales
├── shared/
│   ├── messages/       # Registry and dispatcher for async messaging
│   ├── dashboard.ts    # API composition for the frontend dashboard
│   ├── prisma.ts       # Shared Prisma client
│   └── types.ts        # Shared message payload definitions
└── server.ts           # Express bootstrap and message loop initialization
```
