/**
 * src/shared/messages/registry.ts
 * Maps message type -> array of handler functions.
 *
 * This is the ONLY file in the codebase permitted to import from more than one
 * module folder. All handler registrations happen here at startup so that the
 * dispatcher can route messages without knowing anything about individual modules.
 *
 * Rule: every import below must be a handler registration and nothing else.
 */
import { MessageType, MessageHandler } from "../types";

type HandlerMap = {
  [T in MessageType]?: Array<MessageHandler<T>>;
};

// The registry is a plain module-level map — no class, no singleton boilerplate.
const registry: HandlerMap = {};

/**
 * Register a handler for a given message type.
 * Multiple handlers for the same type are all called in registration order.
 */
export function register<T extends MessageType>(
  type: T,
  handler: MessageHandler<T>
): void {
  if (!registry[type]) {
    (registry as Record<string, MessageHandler[]>)[type] = [];
  }
  (registry[type] as MessageHandler<T>[]).push(handler);
}

/**
 * Return the list of handlers registered for a given type, or an empty array.
 */
export function handlersFor<T extends MessageType>(
  type: T
): Array<MessageHandler<T>> {
  return (registry[type] as Array<MessageHandler<T>>) ?? [];
}

// ---------------------------------------------------------------------------
// Handler registrations
// ---------------------------------------------------------------------------
// These imports are added here as each module is built.  They are the only
// cross-module imports in the whole codebase; keeping them here makes that
// dependency visible and auditable in one place.
//
// Uncomment each block as the corresponding module is implemented.

// Budget module — handles purchase.requested, goods.received, ticket.sold
import { handlePurchaseRequested, handleGoodsReceived, handleTicketSold } from "../../modules/budget/handlers";
register("purchase.requested", handlePurchaseRequested);
register("goods.received",     handleGoodsReceived);
register("ticket.sold",        handleTicketSold);

// Procurement module — handles budget.approved, budget.rejected
import { handleBudgetApproved as procHandleBudgetApproved, handleBudgetRejected } from "../../modules/procurement/handlers";
register("budget.approved", procHandleBudgetApproved);
register("budget.rejected", handleBudgetRejected);

// Projects module — uncomment when projects/handlers.ts is built
// import { handleBudgetApproved as projHandleBudgetApproved } from "../../modules/projects/handlers";
// register("budget.approved", projHandleBudgetApproved);

// Ticketing module — uncomment when ticketing/handlers.ts is built
// import { handleGalleryClosed } from "../../modules/ticketing/handlers";
// register("gallery.closed", handleGalleryClosed);