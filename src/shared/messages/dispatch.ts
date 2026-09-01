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
    const handlers = handlersFor(type);

    if (handlers.length === 0) continue;

    try {
      const payload = msg.payload as MessagePayloads[typeof type];
      for (const handler of handlers) {
        await (handler as (p: typeof payload) => Promise<void>)(payload);
      }
      await prisma.message.update({
        where: { id: msg.id },
        data:  { processedAt: new Date(), processedBy: type },
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