/**
 * src/modules/budget/routes.ts
 * GET /api/budget — budget lines with allocated/committed/spent/available.
 * No imports from any other module folder.
 */
import { Router, Request, Response } from "express";
import { getSummary } from "./service";

export const budgetRouter = Router();

budgetRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const lines = await getSummary();
    res.json(lines);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    res.status(500).json({ error: message });
  }
});