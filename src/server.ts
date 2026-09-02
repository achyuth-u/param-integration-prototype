/**
 * src/server.ts
 * Express bootstrap + route mounting ONLY.
 * No business logic lives here — see SPEC.md section 3.
 */
import "dotenv/config";
import express from "express";
import cors from "cors";

import { budgetRouter } from "./modules/budget/routes";
import { procurementRouter } from "./modules/procurement/routes";
import { projectsRouter } from "./modules/projects/routes";
import { ticketingRouter } from "./modules/ticketing/routes";
import { dispatch } from "./shared/messages/dispatch";

// Importing the registry is enough — its top-level register() calls run on import.
import "./shared/messages/registry";

const app = express();
app.use(cors());
app.use(express.json());

// ── Route mounting ──────────────────────────────────────────────────────────
app.use("/api/budget", budgetRouter);
app.use("/api", procurementRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/ticketing", ticketingRouter);

// ── Dispatcher safety-net: poll every 2 s for unprocessed messages ──────────
setInterval(() => {
  dispatch().catch((err) =>
    console.error("[dispatch]", err instanceof Error ? err.message : err)
  );
}, 2000);

// ── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});