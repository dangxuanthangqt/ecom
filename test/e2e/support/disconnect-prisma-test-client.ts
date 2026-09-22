import { prismaTestClient } from "./prisma-test-client";

/**
 * Jest `setupFilesAfterEnv` for the e2e project. Under Prisma 7 the shared
 * fixture client sits on a real `pg` pool, and an open pool keeps the worker's
 * event loop alive after the last spec — Jest then reports "did not exit one
 * second after the test run". Prisma 6 had no such handle (its engine was a
 * separate process), which is why nothing closed the client before.
 *
 * `$disconnect()` on a client that never connected is a no-op, so this is safe
 * for the specs that do not touch `prismaTestClient` at all.
 */
afterAll(async () => {
  await prismaTestClient.$disconnect();
});
