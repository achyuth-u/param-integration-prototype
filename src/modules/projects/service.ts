/**
 * src/modules/projects/service.ts
 * Read-only queries owned by the projects module.
 * No imports from any other module folder.
 */
import { prisma } from "../../shared/prisma";

export async function listProjects() {
  return prisma.project.findMany({
    include: { milestones: { orderBy: { sequence: "asc" } } },
    orderBy: { code: "asc" },
  });
}

export async function getSummary() {
  const projects = await listProjects();
  return {
    total: projects.length,
    byStatus: {
      planning:    projects.filter((p) => p.status === "PLANNING").length,
      inProgress:  projects.filter((p) => p.status === "IN_PROGRESS").length,
      complete:    projects.filter((p) => p.status === "COMPLETE").length,
    },
    projects: projects.map((p) => ({
      code:   p.code,
      name:   p.name,
      status: p.status,
      milestoneProgress: `${p.milestones.filter((m) => m.status === "DONE").length}/${p.milestones.length}`,
    })),
  };
}