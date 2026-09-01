/**
 * src/modules/budget/service.ts
 * Read-only queries owned by the budget module.
 * No imports from any other module folder.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../../shared/prisma";

export interface BudgetLineSummary {
  id: string;
  projectCode: string;
  fiscalYear: string;
  allocated: string;
  committed: string;
  spent: string;
  available: string; // derived: allocated - committed - spent (never stored)
}

export async function getSummary(): Promise<BudgetLineSummary[]> {
  const lines = await prisma.budgetLine.findMany({
    orderBy: { projectCode: "asc" },
  });

  return lines.map((l) => {
    const allocated  = new Prisma.Decimal(l.allocated);
    const committed  = new Prisma.Decimal(l.committed);
    const spent      = new Prisma.Decimal(l.spent);
    const available  = allocated.sub(committed).sub(spent);

    return {
      id:          l.id,
      projectCode: l.projectCode,
      fiscalYear:  l.fiscalYear,
      allocated:   allocated.toFixed(2),
      committed:   committed.toFixed(2),
      spent:       spent.toFixed(2),
      available:   available.toFixed(2),
    };
  });
}