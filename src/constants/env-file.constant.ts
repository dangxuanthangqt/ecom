import { AppEnv } from "./env.constant";

/**
 * One env file per environment — no layering. `ConfigModule` reads exactly the
 * file this resolver returns, so each file has to be complete on its own; a key
 * defined only in `.env` does NOT fall through to a development boot. That is
 * deliberate: `validateEnv` then fails the boot on a missing key instead of
 * letting an environment silently inherit another one's value.
 *
 * Real process environment variables still win over the file (dotenv never
 * overwrites an already-set key), which is what lets Docker/CI inject secrets.
 */
const ENV_FILE_BY_APP_ENV: Record<string, string> = {
  [AppEnv.DEVELOPMENT]: ".env.development",
  [AppEnv.TEST]: ".env.test",
  [AppEnv.PRODUCTION]: ".env",
};

/** Used when NODE_ENV is unset, so a bare `nest start` never reads `.env.undefined`. */
export const DEFAULT_APP_ENV: string = AppEnv.DEVELOPMENT;

/**
 * The single env file for `nodeEnv`. Throws on an unknown value rather than
 * falling back, so a typo'd NODE_ENV cannot quietly boot production config.
 */
export function resolveEnvFilePath(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): string {
  const appEnv = nodeEnv?.trim() || DEFAULT_APP_ENV;
  const envFilePath = ENV_FILE_BY_APP_ENV[appEnv];

  if (!envFilePath) {
    throw new Error(
      `Unknown NODE_ENV "${appEnv}". Expected one of: ${Object.keys(
        ENV_FILE_BY_APP_ENV,
      ).join(", ")}.`,
    );
  }

  return envFilePath;
}
