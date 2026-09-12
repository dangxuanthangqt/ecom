/**
 * Environment gate for every seed path that writes fake data or destroys rows.
 *
 * Deliberately an allowlist, not a `!== "production"` blocklist. A blocklist lets
 * `staging`, `uat` and `qa` through, and those databases are shared: a stray
 * `prisma migrate reset` or `pnpm db:seed` there would TRUNCATE real tables and
 * then write fixtures with predictable UUIDs and a checked-in password.
 */
const SEEDABLE_ENVIRONMENTS = ["development", "test"];

export const currentEnvironment = (): string =>
  process.env.NODE_ENV || "development";

export const isSeedableEnvironment = (): boolean =>
  SEEDABLE_ENVIRONMENTS.includes(currentEnvironment());

/**
 * Throws unless the current environment is one where destroying and fabricating
 * data is acceptable. `operation` names what was refused, so the error says what
 * to do instead rather than just what failed.
 */
export const assertSeedableEnvironment = (operation: string): void => {
  if (isSeedableEnvironment()) {
    return;
  }

  throw new Error(
    `Refusing to ${operation} with NODE_ENV="${currentEnvironment()}". ` +
      `Only ${SEEDABLE_ENVIRONMENTS.join(" and ")} may run it. ` +
      `Use \`pnpm db:seed:core\` for reference data in a shared environment.`,
  );
};
