import { PrismaClient } from "@prisma/client";

/**
 * Everything a seeder is allowed to touch.
 *
 * The seed process deliberately does NOT boot the Nest application: it only
 * needs a database connection, so spinning up the whole DI graph (Redis, S3,
 * mailer, HTTP listener) would make `prisma migrate reset` slow and fragile.
 */
export interface SeedContext {
  prisma: PrismaClient;
  /** User id stamped into createdById/updatedById audit columns. */
  actorId: string;
  log: (message: string) => void;
}

export interface Seeder {
  /** Shown in the run log. */
  name: string;
  /**
   * `core`  - reference data the application cannot run without. Safe in every
   *           environment, production included.
   * `demo`  - sample catalogue/orders for local development and manual QA.
   *           Never seeded in production.
   */
  tier: "core" | "demo";
  run: (ctx: SeedContext) => Promise<void>;
}

export const defineSeeder = (seeder: Seeder): Seeder => seeder;
