/**
 * src/shared/prisma.ts
 * Single PrismaClient instance shared across the whole application.
 * Import this; never instantiate PrismaClient anywhere else.
 */
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();