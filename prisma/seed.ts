/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

import { resetDatabase } from "./seed/reset";
import {
  currentEnvironment,
  isSeedableEnvironment,
} from "./seed/seed-environment";
import { runSeeders } from "./seed/seed-runner";

config({ path: `.env.${process.env.NODE_ENV || "development"}` });
config(); // fall back to plain .env

const args = new Set(process.argv.slice(2));

/**
 * Demo data is opt-out in development and opt-in nowhere else: seeding fake
 * products into a real environment is a one-way mistake. The environment check
 * is an allowlist, so staging/uat/qa are treated like production, not like dev.
 */
const coreOnly = args.has("--core-only") || !isSeedableEnvironment();

async function main() {
  const prisma = new PrismaClient();

  try {
    if (args.has("--reset")) {
      console.log("• resetting seeded tables");
      await resetDatabase(prisma);
    }

    console.log(
      `• seeding (${coreOnly ? "core only" : "core + demo"}, NODE_ENV=${currentEnvironment()})`,
    );
    await runSeeders(prisma, { coreOnly });
    console.log("• seed complete");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("seed failed:", error);
  process.exit(1);
});
