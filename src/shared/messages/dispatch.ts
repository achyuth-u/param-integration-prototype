/**
 * src/shared/messages/dispatch.ts
 * Selects unprocessed messages (processedAt IS NULL), ordered by id, and
 * runs all registered handlers. On success sets processedAt. On failure
 * records the error string and leaves processedAt null for retry.
 *
 * Called after every write endpoint and on a 2-second setInterval safety net.
 * Target: keep this file under 60 lines.
 */
import { prisma } from "../prisma";
import { handlersFor } from "./registry";
import { MessageType, MessagePayloads } from "../types";

export async function dispatch(): Promise<void> {
  const pending = await prisma.message.findMany({
    where: { processedAt: null },
    orderBy: { id: "asc" },
  });

  for (const msg of pending) {
    const type = msg.type as MessageType;
    const entries = handlersFor(type);

    if (entries.length === 0) continue;

    try {
      const payload = msg.payload as MessagePayloads[typeof type];
      const modules: string[] = [];
      for (const entry of entries) {
        await (entry.handler as (p: typeof payload) => Promise<void>)(payload);
        modules.push(entry.module);
      }
      await prisma.message.update({
        where: { id: msg.id },
        data:  { processedAt: new Date(), processedBy: modules.join(",") },
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      await prisma.message.update({
        where: { id: msg.id },
        data:  { error },
      });
    }
  }
}
