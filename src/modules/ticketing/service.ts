/**
 * src/modules/ticketing/service.ts
 * Read-only queries owned by the ticketing module.
 * No imports from any other module folder.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../../shared/prisma";

export async function getSummary() {
  const [sales, galleries] = await Promise.all([
    prisma.ticketSale.findMany({
      include: { ticketType: true },
      orderBy: { soldAt: "desc" },
    }),
    prisma.galleryAvailability.findMany({
      orderBy: { galleryCode: "asc" },
    }),
  ]);

  // Aggregate revenue
  const totalRevenue = sales.reduce(
    (sum, s) => sum.add(new Prisma.Decimal(s.amount)),
    new Prisma.Decimal(0)
  );

  const totalTickets = sales.reduce((sum, s) => sum + s.quantity, 0);

  return {
    totalRevenue: totalRevenue.toFixed(2),
    totalTickets,
    recentSales: sales.slice(0, 20).map((s) => ({
      id:         s.id,
      ticketType: s.ticketType.name,
      quantity:   s.quantity,
      amount:     new Prisma.Decimal(s.amount).toFixed(2),
      soldAt:     s.soldAt,
    })),
    galleries: galleries.map((g) => ({
      galleryCode: g.galleryCode,
      name:        g.name,
      isOpen:      g.isOpen,
      closedFrom:  g.closedFrom,
      closedTo:    g.closedTo,
      closedFor:   g.closedFor,
    })),
  };
}