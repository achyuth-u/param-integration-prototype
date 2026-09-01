/**
 * src/modules/procurement/handlers.ts
 * Handles: budget.approved | budget.rejected
 *
 * This module learns the outcome of a purchase request ONLY through messages.
 * It never queries budget, project, or ticketing tables.
 * No imports from any other module folder.
 */
import { prisma } from "../../shared/prisma";
import { MessagePayloads } from "../../shared/types";

// ---------------------------------------------------------------------------
// budget.approved
// ---------------------------------------------------------------------------
//
// Sets the purchase request status to APPROVED.
//
export async function handleBudgetApproved(
  payload: MessagePayloads["budget.approved"]
): Promise<void> {
  const { prNumber } = payload;

  await prisma.purchaseRequest.update({
    where: { prNumber },
    data: {
      status:    "APPROVED",
      decidedAt: new Date(),
    },
  });
}

// ---------------------------------------------------------------------------
// budget.rejected
// ---------------------------------------------------------------------------
//
// Sets the purchase request status to REJECTED and stores the reason.
//
export async function handleBudgetRejected(
  payload: MessagePayloads["budget.rejected"]
): Promise<void> {
  const { prNumber, reason } = payload;

  await prisma.purchaseRequest.update({
    where: { prNumber },
    data: {
      status:         "REJECTED",
      decisionReason: reason,
      decidedAt:      new Date(),
    },
  });
}