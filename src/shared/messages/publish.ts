/**
 * src/shared/messages/publish.ts
 * Writes a single Message row.
 *
 * Accepts an optional Prisma transaction client (tx) so the message can be
 * written in the same transaction as the state change that triggered it —
 * ensuring the message is never persisted without the state change, and vice versa.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { MessageType, MessagePayloads } from "../types";

type TxClient = Prisma.TransactionClient;

export async function publish<T extends MessageType>(
  type: T,
  payload: MessagePayloads[T],
  tx?: TxClient
): Promise<void> {
  const client = tx ?? prisma;
  await client.message.create({
    data: {
      type,
      payload: payload as Prisma.InputJsonValue,
    },
  });
}