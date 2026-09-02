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

export interface RegisteredHandler<T extends MessageType = MessageType> {
  module: string;
  handler: MessageHandler<T>;
}

type HandlerMap = {
  [T in MessageType]?: Array<RegisteredHandler<T>>;
};

// The registry is a plain module-level map — no class, no singleton boilerplate.
const registry: HandlerMap = {};

/**
 * Register a handler for a given message type.
 * `moduleName` identifies which module owns this handler (e.g. "budget").
 * Multiple handlers for the same type are all called in registration order.
 */
export function register<T extends MessageType>(
  type: T,
  moduleName: string,
  handler: MessageHandler<T>
): void {
  if (!registry[type]) {
    (registry as Record<string, RegisteredHandler[]>)[type] = [];
  }
  (registry[type] as RegisteredHandler<T>[]).push({ module: moduleName, handler });
}

/**
 * Return the list of registered handlers for a given type, or an empty array.
 * Each entry includes the module name and the handler function.
 */
export function handlersFor<T extends MessageType>(
  type: T
): Array<RegisteredHandler<T>> {
  return (registry[type] as Array<RegisteredHandler<T>>) ?? [];
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
register("purchase.requested", "budget",      handlePurchaseRequested);
register("goods.received",     "budget",      handleGoodsReceived);
register("ticket.sold",        "budget",      handleTicketSold);

// Procurement module — handles budget.approved, budget.rejected
import { handleBudgetApproved as procHandleBudgetApproved, handleBudgetRejected } from "../../modules/procurement/handlers";
register("budget.approved", "procurement", procHandleBudgetApproved);
register("budget.rejected", "procurement", handleBudgetRejected);

// Projects module — handles budget.approved (advances milestone)
import { handleBudgetApproved as projHandleBudgetApproved } from "../../modules/projects/handlers";
register("budget.approved", "projects",    projHandleBudgetApproved);

// Ticketing module — handles gallery.closed
import { handleGalleryClosed } from "../../modules/ticketing/handlers";
register("gallery.closed",  "ticketing",   handleGalleryClosed);