import { PrismaClient } from "@prisma/client";

/**
 * One shared `PrismaClient` for specs and helpers to read/write fixtures and
 * assert on database state directly. Deliberately separate from the
 * `PrismaService` instance inside the booted `INestApplication` — specs reach
 * for this one for setup/assertions, the app's own instance serves requests;
 * both point at the same `ecom_e2e` database (`DATABASE_URL` from
 * `.env.test`), so nothing here needs coordinating with `createTestApp()`.
 */
export const prismaTestClient = new PrismaClient();
