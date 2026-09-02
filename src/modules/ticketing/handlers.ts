/**
 * src/modules/ticketing/handlers.ts
 * Handles: gallery.closed
 *
 * Sets GalleryAvailability.isOpen = false and records the date range and the
 * project responsible for the closure.
 *
 * No imports from any other module folder.
 */
import { prisma } from "../../shared/prisma";
import { MessagePayloads } from "../../shared/types";

export async function handleGalleryClosed(
  payload: MessagePayloads["gallery.closed"]
): Promise<void> {
  const { galleryCode, projectCode, from, to } = payload;

  await prisma.galleryAvailability.update({
    where: { galleryCode },
    data: {
      isOpen:     false,
      closedFrom: new Date(from),
      closedTo:   new Date(to),
      closedFor:  projectCode,
    },
  });
}