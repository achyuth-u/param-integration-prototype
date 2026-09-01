/**
 * src/modules/budget/handlers.ts
 * Handles: purchase.requested | goods.received | ticket.sold
 * No imports from any other module folder.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../../shared/prisma";
import { publish } from "../../shared/messages/publish";
import { MessagePayloads } from "../../shared/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FISCAL_YEAR = "2026-27";

/** Row shape returned by the raw SELECT FOR UPDATE. */
interface BudgetLineRow {
  id: string;
  allocated: string; // MySQL returns DECIMAL columns as strings via queryRaw
  committed: string;
  spent: string;
}

// ---------------------------------------------------------------------------
// purchase.requested
// ---------------------------------------------------------------------------
//
// Opens a transaction and locks the BudgetLine row with SELECT ... FOR UPDATE
// so that concurrent requests against the same line cannot both see the same
// balance and both be approved (MySQL REPEATABLE READ does not prevent this;
// the row lock does).  See SPEC.md section 7 for the full explanation.
//
export async function handlePurchaseRequested(
  payload: MessagePayloads["purchase.requested"]
): Promise<void> {
  const { prNumber, projectCode, amount: amountStr } = payload;
  const requested = new Prisma.Decimal(amountStr);

  await prisma.$transaction(async (tx) => {
    // Lock the row for the duration of this transaction.
    const rows = await tx.$queryRaw<BudgetLineRow[]>`
      SELECT id, allocated, committed, spent
      FROM BudgetLine
      WHERE projectCode = ${projectCode}
        AND fiscalYear  = ${FISCAL_YEAR}
      FOR UPDATE
    `;

    if (rows.length === 0) {
      await publish(
        "budget.rejected",
        {
          prNumber,
          projectCode,
          amount: amountStr,
          reason: `No budget line found for project ${projectCode} in ${FISCAL_YEAR}.`,
        },
        tx
      );
      return;
    }

    const row       = rows[0];
    const allocated = new Prisma.Decimal(row.allocated);
    const committed = new Prisma.Decimal(row.committed);
    const spent     = new Prisma.Decimal(row.spent);
    const available = allocated.sub(committed).sub(spent);

    if (available.gte(requested)) {
      // Create commitment and update the budget line atomically.
      const commitment = await tx.commitment.create({
        data: {
          budgetLineId: row.id,
          sourceRef:    prNumber,
          amount:       requested,
          status:       "ACTIVE",
        },
      });

      await tx.budgetLine.update({
        where: { id: row.id },
        data:  { committed: committed.add(requested) },
      });

      await publish(
        "budget.approved",
        {
          prNumber,
          projectCode,
          amount:       amountStr,
          commitmentId: commitment.id,
        },
        tx
      );
    } else {
      const shortfall = requested.sub(available);
      await publish(
        "budget.rejected",
        {
          prNumber,
          projectCode,
          amount: amountStr,
          reason: `Insufficient funds: available \u20B9${available.toFixed(2)}, ` +
                  `requested \u20B9${requested.toFixed(2)}, ` +
                  `shortfall \u20B9${shortfall.toFixed(2)}.`,
        },
        tx
      );
    }
  });
}

// ---------------------------------------------------------------------------
// goods.received
// ---------------------------------------------------------------------------
//
// Converts an ACTIVE Commitment into an Expense:
//   committed -= amount, spent += amount, commitment.status = CONVERTED.
//
export async function handleGoodsReceived(
  payload: MessagePayloads["goods.received"]
): Promise<void> {
  const { prNumber, amount: amountStr } = payload;
  const amount = new Prisma.Decimal(amountStr);

  await prisma.$transaction(async (tx) => {
    const commitment = await tx.commitment.findFirst({
      where:   { sourceRef: prNumber, status: "ACTIVE" },
      include: { budgetLine: true },
    });

    if (!commitment) {
      // Nothing to convert — idempotent, so we do not throw.
      return;
    }

    const line      = commitment.budgetLine;
    const committed = new Prisma.Decimal(line.committed).sub(amount);
    const spent     = new Prisma.Decimal(line.spent).add(amount);

    await tx.budgetLine.update({
      where: { id: line.id },
      data:  { committed, spent },
    });

    await tx.commitment.update({
      where: { id: commitment.id },
      data:  { status: "CONVERTED" },
    });

    await tx.expense.create({
      data: {
        budgetLineId: line.id,
        sourceRef:    prNumber,
        amount,
      },
    });
  });
}

// ---------------------------------------------------------------------------
// ticket.sold
// ---------------------------------------------------------------------------
//
// Posts revenue to the Income ledger.
//
export async function handleTicketSold(
  payload: MessagePayloads["ticket.sold"]
): Promise<void> {
  const { amount: amountStr } = payload;
  await prisma.income.create({
    data: {
      source: "ticketing",
      amount: new Prisma.Decimal(amountStr),
    },
  });
}