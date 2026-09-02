/**
 * src/modules/projects/routes.ts
 *
 * GET  /api/projects                  — list with milestones
 * POST /api/projects/:code/close-gallery — schedule a gallery closure
 *
 * No imports from any other module folder.
 */
import { Router, Request, Response } from "express";
import { prisma } from "../../shared/prisma";
import { publish } from "../../shared/messages/publish";
import { dispatch } from "../../shared/messages/dispatch";
import { listProjects } from "./service";

export const projectsRouter = Router();

// ── GET /api/projects ───────────────────────────────────────────────────────
projectsRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const projects = await listProjects();
    res.json(projects);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    res.status(500).json({ error: message });
  }
});

// ── POST /api/projects/:code/close-gallery ──────────────────────────────────
//
// Publishes gallery.closed so ticketing can mark the gallery unavailable.
// The projects module owns the decision; ticketing reacts via the message.
//
projectsRouter.post("/:code/close-gallery", async (req: Request<{ code: string }>, res: Response) => {
  try {
    const code = req.params.code;
    const { from, to } = req.body as { from: string; to: string };

    if (!from || !to) {
      res.status(400).json({ error: "Missing required fields: from, to" });
      return;
    }

    const project = await prisma.project.findUnique({ where: { code } });
    if (!project) {
      res.status(404).json({ error: `Project ${code} not found` });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await publish(
        "gallery.closed",
        {
          galleryCode: project.galleryCode,
          projectCode: code,
          from,
          to,
        },
        tx
      );
    });

    // Trigger dispatch so ticketing handles it immediately.
    await dispatch();

    res.json({ ok: true, galleryCode: project.galleryCode, from, to });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    res.status(500).json({ error: message });
  }
});