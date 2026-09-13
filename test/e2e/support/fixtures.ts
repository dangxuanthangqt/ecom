/**
 * Re-exports the seeded fixture ids and shared demo password so specs never
 * hardcode a UUID or password of their own. These rows are seeded by
 * `prisma/seed.ts --reset` (via `scripts/prepare-e2e-database.sh`) and are
 * read-only for read-path specs — see the phase-01 plan's fixture policy.
 */
export {
  BrandId,
  CategoryId,
  LanguageId,
  OrderId,
  ProductId,
  RoleId,
  UserId,
} from "@/seed/seed-ids";
export { DEMO_PASSWORD } from "@/seed/seeders/demo-users.seeder";

/** Seeded fixture emails, matching `prisma/seed/seeders/demo-users.seeder.ts`. */
export const FixtureEmail = {
  SELLER: "seller@ecom.local",
  CLIENT: "client@ecom.local",
  CLIENT_SECONDARY: "client2@ecom.local",
} as const;
