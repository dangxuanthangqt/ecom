/**
 * Fixed identifiers for every seeded row.
 *
 * Seed data MUST be deterministic: the same id on every machine and on every
 * re-run. That is what makes the seeders idempotent (upsert instead of insert)
 * and what lets Postman collections, e2e tests and frontend fixtures hardcode
 * ids without breaking after `prisma migrate reset`.
 *
 * Never use `uuid()` here. The volume seeder (`prisma/seed-volume.ts`) is the
 * one place random ids are correct, because nothing references its rows by id.
 */

const uuid = (prefix: number, index: number): string =>
  `${prefix.toString().padStart(8, "0")}-0000-4000-8000-${index
    .toString()
    .padStart(12, "0")}`;

export const RoleId = {
  ADMIN: uuid(1, 1),
  CLIENT: uuid(1, 2),
  SELLER: uuid(1, 3),
} as const;

export const UserId = {
  ADMIN: uuid(2, 1),
  SELLER: uuid(2, 2),
  CLIENT: uuid(2, 3),
  CLIENT_SECONDARY: uuid(2, 4),
  /** Owns everything the volume seeder creates, so `--clean` can find it again. */
  VOLUME_ACTOR: uuid(2, 99),
} as const;

export const BrandId = {
  APPLE: uuid(3, 1),
  SAMSUNG: uuid(3, 2),
  NIKE: uuid(3, 3),
  SONY: uuid(3, 4),
  ADIDAS: uuid(3, 5),
  XIAOMI: uuid(3, 6),
} as const;

export const CategoryId = {
  ELECTRONICS: uuid(4, 1),
  PHONES: uuid(4, 2),
  LAPTOPS: uuid(4, 3),
  FASHION: uuid(4, 4),
  SHOES: uuid(4, 5),
  AUDIO: uuid(4, 6),
  CLOTHING: uuid(4, 7),
  HOME: uuid(4, 8),
  KITCHEN: uuid(4, 9),
} as const;

/**
 * Hero products are referenced by the cart/order/review fixtures, so they keep
 * named ids. Everything else in the catalogue is addressed positionally.
 */
export const ProductId = {
  IPHONE_15: uuid(5, 1),
  MACBOOK_AIR: uuid(5, 2),
  GALAXY_S24: uuid(5, 3),
  AIR_MAX: uuid(5, 4),
  UNPUBLISHED_DRAFT: uuid(5, 5),
} as const;

/** Ids for the bulk catalogue entries; indexes start at 100 to stay clear of the heroes. */
export const catalogProductId = (index: number): string => uuid(5, index);

export const OrderId = {
  DELIVERED: uuid(6, 1),
  PENDING_CONFIRMATION: uuid(6, 2),
  PENDING_PICKUP: uuid(6, 3),
  PENDING_DELIVERY: uuid(6, 4),
  RETURNED: uuid(6, 5),
  CANCELLED: uuid(6, 6),
} as const;

export const LanguageId = {
  EN: "en",
  VI: "vi",
} as const;

/** SKU ids are derived so the product fixtures stay readable. */
export const skuId = (productIndex: number, skuIndex: number): string =>
  `00000007-0000-4000-8000-${`${productIndex}`.padStart(6, "0")}${`${skuIndex}`.padStart(6, "0")}`;

/**
 * Builds a stable child id from a parent row id by injecting a 4-hex marker into
 * the second UUID block. Lets child rows be upserted by primary key even when the
 * table has no composite unique constraint Prisma can target.
 */
export const derivedId = (parentId: string, block: string): string => {
  const [first, , ...rest] = parentId.split("-");

  return [first, block, ...rest].join("-");
};

/** Hex block injected into a translation id so it stays unique per language. */
const LANGUAGE_BLOCK: Record<string, string> = {
  [LanguageId.EN]: "0e00",
  [LanguageId.VI]: "0f00",
};

export const translationId = (parentId: string, languageId: string): string => {
  const block = LANGUAGE_BLOCK[languageId];

  if (!block) {
    throw new Error(
      `No translation id block configured for language "${languageId}"`,
    );
  }

  return derivedId(parentId, block);
};
