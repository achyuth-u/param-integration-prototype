/**
 * src/shared/dashboard.ts
 *
 * GET /api/dashboard  — cross-module summary
 * GET /api/messages   — activity feed (50 most recent messages)
 *
 * ──────────────────────────────────────────────────────────────────────────
 * THIS IS THE ONE PLACE ALL FOUR DOMAINS MEET.
 *
 * It composes each module's exported getSummary() function and combines the
 * results.  It NEVER queries tables directly.  This is deliberate:
 *
 *   - Rule 4 (SPEC.md §0) says no module queries another module's tables.
 *   - The dashboard is not a module — it is shared infrastructure.  But it
 *     still respects the boundary by calling read-only functions each module
 *     already exports, rather than reaching into their Prisma models.
 *   - If a module is later replaced (e.g. budget → real accounting system),
 *     only its getSummary() implementation changes.  This file is untouched.
 *
 * The only direct table access here is prisma.message, which belongs to the
 * shared layer (the Message model is not owned by any module).
 * ──────────────────────────────────────────────────────────────────────────
 */
import { Router, Request, Response } from "express";
import { prisma } from "./prisma";

// Each module exposes a getSummary() — import them by name.
import { getSummary as getBudgetSummary }      from "../modules/budget/service";
import { getSummary as getProcurementSummary } from "../modules/procurement/service";
import { getSummary as getProjectsSummary }    from "../modules/projects/service";
import { getSummary as getTicketingSummary }    from "../modules/ticketing/service";

export const dashboardRouter = Router();

// ── GET /api/dashboard ──────────────────────────────────────────────────────
dashboardRouter.get("/dashboard", async (_req: Request, res: Response) => {
  try {
    // Run all four summaries in parallel — none depends on another.
    const [budget, procurement, projects, ticketing] = await Promise.all([
      getBudgetSummary(),
      getProcurementSummary(),
      getProjectsSummary(),
      getTicketingSummary(),
    ]);

    res.json({ budget, procurement, projects, ticketing });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    res.status(500).json({ error: message });
  }
});

// ── GET /api/messages ───────────────────────────────────────────────────────
// Activity feed — the Message table belongs to the shared layer, not a module.
dashboardRouter.get("/messages", async (_req: Request, res: Response) => {
  try {
    const messages = await prisma.message.findMany({
      orderBy: { id: "desc" },
      take: 50,
    });

    // BigInt is not JSON-serialisable by default; convert id to string.
    const serialised = messages.map((m) => ({
      ...m,
      id: m.id.toString(),
    }));

    res.json(serialised);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    res.status(500).json({ error: message });
  }
});