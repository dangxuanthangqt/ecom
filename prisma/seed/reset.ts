import { PrismaClient } from "@prisma/client";

import { assertSeedableEnvironment } from "./seed-environment";

/**
 * Tables wiped by `--reset`, child-first. Deliberately excludes _prisma_migrations
 * so the schema history survives; use `prisma migrate reset` when you want the
 * database itself rebuilt.
 *
 * This list must stay exhaustive. Postgres TRUNCATE ... CASCADE follows FK
 * constraints regardless of Prisma's onDelete setting, so any table referencing
 * one listed here is wiped whether or not it appears — `Message` and the
 * implicit `_PermissionToRole` join table both hang off rows listed below.
 * Naming them keeps the list honest about what actually goes.
 */
const TABLES = [
  "Review",
  "Message",
  "ProductSKUSnapshot",
  "CartItem",
  "Message",
  "PaymentTransaction",
  '"Order"',
  "SKU",
  "ProductTranslation",
  "Product",
  "CategoryTranslation",
  "Category",
  "BrandTranslation",
  "Brand",
  "RefreshToken",
  "Device",
  "VerificationCode",
  "UserTranslation",
  '"User"',
  "Permission",
  "Role",
  "Language",
];

export const resetDatabase = async (prisma: PrismaClient): Promise<void> => {
  assertSeedableEnvironment("TRUNCATE the seeded tables (seed --reset)");

  const quoted = TABLES.map((table) =>
    table.startsWith('"') ? table : `"${table}"`,
  ).join(", ");

  // Single statement so FK checks are evaluated once, at the end.
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE;`,
  );
};
