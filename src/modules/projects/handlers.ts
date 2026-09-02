/**
 * src/modules/projects/handlers.ts
 * Handles: budget.approved
 *
 * On approval, advances the first NOT_STARTED milestone for the relevant
 * project to IN_PROGRESS.  This is how the projects module learns that
 * procurement activity has begun — entirely through messages.
 *
 * No imports from any other module folder.
 */
import { prisma } from "../../shared/prisma";
import { MessagePayloads } from "../../shared/types";

export async function handleBudgetApproved(
  payload: MessagePayloads["budget.approved"]
): Promise<void> {
  const { projectCode } = payload;

  // Find the project by its code.
  const project = await prisma.project.findUnique({
    where: { code: projectCode },
    include: { milestones: { orderBy: { sequence: "asc" } } },
  });

  if (!project) return; // no matching project — nothing to update

  // Advance the first NOT_STARTED milestone to IN_PROGRESS.
  const next = project.milestones.find((m) => m.status === "NOT_STARTED");
  if (!next) return; // all milestones already started or done

  await prisma.milestone.update({
    where: { id: next.id },
    data:  { status: "IN_PROGRESS" },
  });
}