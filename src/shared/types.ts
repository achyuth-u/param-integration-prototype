/**
 * src/shared/types.ts
 * Cross-module payload types and the MessageType union.
 * Nothing in here imports from any module folder.
 */

/**
 * The six message types in the catalogue (section 5 of SPEC.md).
 * Do not add more without a documented reason.
 */
export type MessageType = keyof MessagePayloads;

/**
 * Payload shapes for every message type.
 * Money amounts are serialised as strings to avoid floating-point loss;
 * convert to Prisma.Decimal at the point of use.
 */
export type MessagePayloads = {
  "purchase.requested": { prNumber: string; projectCode: string; amount: string };
  "budget.approved":    { prNumber: string; projectCode: string; amount: string; commitmentId: string };
  "budget.rejected":    { prNumber: string; projectCode: string; amount: string; reason: string };
  "goods.received":     { prNumber: string; projectCode: string; amount: string };
  "gallery.closed":     { galleryCode: string; projectCode: string; from: string; to: string };
  "ticket.sold":        { amount: string; quantity: number; ticketTypeName: string };
};

/**
 * The function signature every message handler must satisfy.
 * The payload is typed to the specific message type via the generic parameter.
 */
export type MessageHandler<T extends MessageType = MessageType> = (
  payload: MessagePayloads[T]
) => Promise<void>;