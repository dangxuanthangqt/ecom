/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

import { assertSeedableEnvironment } from "./seed/seed-environment";
import { cleanVolumeData } from "./seed/volume/volume-clean";
import { describeVolume, parseVolumeConfig } from "./seed/volume/volume-config";
import { runVolumeSeed } from "./seed/volume/volume-runner";

config({ path: `.env.${process.env.NODE_ENV || "development"}` });
config();

/**
 * Bulk data generator, deliberately separate from `prisma/seed.ts`.
 *
 * The fixture seed is small, deterministic and re-run on every `migrate reset`.
 * This one is large, random and run on demand — for pagination, index and query
 * performance work. Mixing them would make the everyday dev loop slow and would
 * stop tests from hardcoding ids.
 *
 * Not wrapped in a transaction: a 100k-row write held open as one transaction is
 * a lock and WAL problem, and there is nothing to protect — `--clean` undoes it.
 */
async function main() {
  assertSeedableEnvironment("generate volume data");

  const args = process.argv.slice(2);
  const prisma = new PrismaClient();

  try {
    if (args.includes("--clean")) {
      console.log("• removing volume data");
      await cleanVolumeData(prisma);

      return;
    }

    const volumeConfig = parseVolumeConfig(args);

    console.log(`• generating ${describeVolume(volumeConfig)}`);
    const startedAt = Date.now();

    await runVolumeSeed(prisma, volumeConfig);
    console.log(
      `• volume seed complete in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("volume seed failed:", error);
  process.exit(1);
});
