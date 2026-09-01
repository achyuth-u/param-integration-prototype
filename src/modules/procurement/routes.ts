/**
 * src/modules/procurement/routes.ts
 *
 * GET  /api/purchase-requests         — list all PRs with vendor
 * GET  /api/vendors                   — vendor dropdown
 * POST /api/purchase-requests         — create PENDING PR + publish purchase.requested
 * POST /api/purchase-requests/:id/receive-goods — mark received + publish goods.received
 *
 * No imports from any other module folder.
 * Does NOT query budget, project, or ticketing tables.
 */
import { Router, Request, Response } from "express";
import { prisma } from "../../shared/prisma";
import { publish } from "../../shared/messages/publish";
import { dispatch } from "../../shared/messages/dispatch";
import { listPurchaseRequests, listVendors } from "./service";

export const procurementRouter = Router();

// ── GET /api/purchase-requests ──────────────────────────────────────────────
procurementRouter.get("/purchase-requests", async (_req: Request, res: Response) => {
  try {
    const prs = await listPurchaseRequests();
    res.json(prs);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    res.status(500).json({ error: message });
  }
});

// ── GET /api/vendors ────────────────────────────────────────────────────────
procurementRouter.get("/vendors", async (_req: Request, res: Response) => {
  try {
    const vendors = await listVendors();
    res.json(vendors);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    res.status(500).json({ error: message });
  }
});

// ── POST /api/purchase-requests ─────────────────────────────────────────────
//
// Creates a PENDING PurchaseRequest and publishes purchase.requested in the
// SAME transaction, so the message is never persisted without the request.
//
procurementRouter.post("/purchase-requests", async (req: Request, res: Response) => {
  try {
    const { projectCode, vendorId, description, amount } = req.body as {
      projectCode: string;
      vendorId: string;
      description: string;
      amount: string;
    };

    if (!projectCode || !vendorId || !description || !amount) {
      res.status(400).json({ error: "Missing required fields: projectCode, vendorId, description, amount" });
      return;
    }

    // Generate a sequential PR number.
    const count = await prisma.purchaseRequest.count();
    const prNumber = `PR-${String(count + 1).padStart(3, "0")}`;

    const pr = await prisma.$transaction(async (tx) => {
      const created = await tx.purchaseRequest.create({
        data: {
          prNumber,
          projectCode,
          vendorId,
          description,
          amount,
          status: "PENDING",
        },
        include: { vendor: true },
      });

      await publish(
        "purchase.requested",
        { prNumber, projectCode, amount },
        tx
      );

      return created;
    });

    // Trigger dispatch so the budget handler runs immediately.
    await dispatch();

    res.status(201).json(pr);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    res.status(500).json({ error: message });
  }
});

// ── POST /api/purchase-requests/:id/receive-goods ───────────────────────────
//
// Marks the PR as RECEIVED and publishes goods.received so the budget module
// can convert the commitment into an expense.
//
procurementRouter.post("/purchase-requests/:id/receive-goods", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const id = req.params.id;

    const pr = await prisma.purchaseRequest.findUnique({ where: { id } });
    if (!pr) {
      res.status(404).json({ error: "Purchase request not found" });
      return;
    }
    if (pr.status !== "APPROVED") {
      res.status(409).json({ error: `Cannot receive goods: PR status is ${pr.status}, expected APPROVED` });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.purchaseRequest.update({
        where: { id },
        data: {
          status:     "RECEIVED",
          receivedAt: new Date(),
        },
      });

      await publish(
        "goods.received",
        {
          prNumber:    pr.prNumber,
          projectCode: pr.projectCode,
          amount:      pr.amount.toString(),
        },
        tx
      );
    });

    // Trigger dispatch so the budget handler runs immediately.
    await dispatch();

    const updated = await prisma.purchaseRequest.findUnique({
      where: { id },
      include: { vendor: true },
    });
    res.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    res.status(500).json({ error: message });
  }
});