import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

/**
 * Holds the registry honest: every business failure names a registered code.
 *
 * This started as a ratchet while the domains were migrated one at a time. They
 * all landed, so it is now the stronger assertion — a new uncoded business
 * failure fails here rather than reaching a client that cannot branch on it.
 *
 * `type: "internal"` is excluded by design: a client cannot act on an
 * infrastructure failure, so naming those would grow the registry for nothing.
 * See `docs/error-handling.md`.
 */
const SOURCE_ROOT = join(__dirname, "..", "..", "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);

    if (statSync(full).isDirectory()) {
      return entry === "__tests__" ? [] : sourceFiles(full);
    }

    return entry.endsWith(".ts") ? [full] : [];
  });
}

/** Strips line comments so commented-out calls are not counted as live ones. */
const withoutComments = (source: string): string =>
  source
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");

function uncodedBusinessThrows(): string[] {
  const found: string[] = [];

  for (const file of sourceFiles(SOURCE_ROOT)) {
    const source = withoutComments(readFileSync(file, "utf8"));

    // The scan assumes what every call site looks like today: one flat object
    // literal closed by `});`, with no nested object or array argument. Add a
    // nested argument to `throwHttpException` and this stops matching — which
    // would quietly disarm the check rather than fail it, so widen the scan (or
    // count braces) in the same change.
    for (const match of source.matchAll(/throwHttpException\(\{(.*?)\}\);/gs)) {
      const body = match[1];
      const isInfrastructure = body.includes('type: "internal"');
      const isCoded = body.includes("code: ErrorCode.");

      if (!isInfrastructure && !isCoded) {
        found.push(`${file.replace(SOURCE_ROOT, "src")}: ${body.trim()}`);
      }
    }
  }

  return found;
}

describe("error code coverage", () => {
  it("gives every business failure a registered code", () => {
    expect(uncodedBusinessThrows()).toEqual([]);
  });
});
