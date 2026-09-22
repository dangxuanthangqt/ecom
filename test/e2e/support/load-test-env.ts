import { config } from "dotenv";

import { resolveEnvFilePath } from "@/constants/env-file.constant";

/**
 * Jest `setupFiles` (not `setupFilesAfterEnv`) runs before the module registry
 * is populated, so `.env.test` lands in `process.env` before anything —
 * `PrismaService`/`PrismaClient` included — reads `DATABASE_URL` at
 * construction time. Relying on `ConfigModule.forRoot`'s own
 * env-file lookup would be too late: by the time Nest wires up the module
 * graph, `PrismaClient` may already have been constructed with the wrong (or
 * missing) `DATABASE_URL`.
 */
process.env.NODE_ENV = "test";

config({ path: resolveEnvFilePath() });
