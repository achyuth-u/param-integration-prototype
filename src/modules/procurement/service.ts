/**
 * src/modules/procurement/service.ts
 * Read-only queries owned by the procurement module.
 * No imports from any other module folder.
 * Does NOT query budget, project, or ticketing tables.
 */
import { prisma } from "../../shared/prisma";

export async function listPurchaseRequests() {
  return prisma.purchaseRequest.findMany({
    include: { vendor: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function listVendors() {
  return prisma.vendor.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getSummary() {
  const [requests, vendors] = await Promise.all([
    prisma.purchaseRequest.count(),
    prisma.vendor.count(),
  ]);

  const pending  = await prisma.purchaseRequest.count({ where: { status: "PENDING" } });
  const approved = await prisma.purchaseRequest.count({ where: { status: "APPROVED" } });
  const rejected = await prisma.purchaseRequest.count({ where: { status: "REJECTED" } });
  const received = await prisma.purchaseRequest.count({ where: { status: "RECEIVED" } });

  return { total: requests, pending, approved, rejected, received, vendors };
}