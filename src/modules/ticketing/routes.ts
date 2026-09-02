/**
 * src/modules/ticketing/routes.ts
 *
 * GET  /api/ticketing       — sales summary + gallery availability
 * POST /api/ticketing/sales — log a sale (409 if gallery closed)
 *
 * No imports from any other module folder.
 */
import { Router, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../shared/prisma";
import { publish } from "../../shared/messages/publish";
import { dispatch } from "../../shared/messages/dispatch";
import { getSummary } from "./service";

export const ticketingRouter = Router();

// ── GET /api/ticketing ──────────────────────────────────────────────────────
ticketingRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const summary = await getSummary();
    res.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    res.status(500).json({ error: message });
  }
});

// ── POST /api/ticketing/sales ───────────────────────────────────────────────
//
// Logs a ticket sale. Returns 409 if any referenced gallery is currently closed.
//
ticketingRouter.post("/sales", async (req: Request, res: Response) => {
  try {
    const { ticketTypeId, quantity } = req.body as {
      ticketTypeId: string;
      quantity: number;
    };

    if (!ticketTypeId || !quantity || quantity <= 0) {
      res.status(400).json({ error: "Missing or invalid fields: ticketTypeId, quantity" });
      return;
    }

    // Check if any gallery is closed — if so, reject with 409.
    const closedGalleries = await prisma.galleryAvailability.findMany({
      where: { isOpen: false },
    });

    if (closedGalleries.length > 0) {
      const names = closedGalleries
        .map((g) => `${g.name} (closed for ${g.closedFor ?? "maintenance"})`)
        .join(", ");
      res.status(409).json({
        error: `Cannot sell tickets: the following galleries are closed — ${names}`,
      });
      return;
    }

    // Look up the ticket type to get the price.
    const ticketType = await prisma.ticketType.findUnique({
      where: { id: ticketTypeId },
    });

    if (!ticketType) {
      res.status(404).json({ error: "Ticket type not found" });
      return;
    }

    const amount = new Prisma.Decimal(ticketType.price).mul(quantity);

    const sale = await prisma.$transaction(async (tx) => {
      const created = await tx.ticketSale.create({
        data: {
          ticketTypeId,
          quantity,
          amount,
        },
        include: { ticketType: true },
      });

      await publish(
        "ticket.sold",
        {
          amount:         amount.toFixed(2),
          quantity,
          ticketTypeName: ticketType.name,
        },
        tx
      );

      return created;
    });

    // Trigger dispatch so the budget handler records income immediately.
    await dispatch();

    res.status(201).json({
      id:         sale.id,
      ticketType: sale.ticketType.name,
      quantity:   sale.quantity,
      amount:     new Prisma.Decimal(sale.amount).toFixed(2),
      soldAt:     sale.soldAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    res.status(500).json({ error: message });
  }
});