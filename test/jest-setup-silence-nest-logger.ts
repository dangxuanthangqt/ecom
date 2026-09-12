import { Logger } from "@nestjs/common";

/**
 * Negative-path specs deliberately drive the code under test into its error
 * branches, where it calls `this.logger.error()`. Nest writes those straight to
 * `process.stdout`, so neither `jest --silent` nor a `console` spy suppresses
 * them: a fully green run still floods the console with red output that reads
 * like real failures.
 *
 * `Logger.overrideLogger()` is not enough — `TestingModuleBuilder.compile()`
 * reinstalls its own `TestingLogger`, which forwards `error` to the console, so
 * every harness that builds a testing module would undo the silencing. Blanking
 * the prototype methods instead covers the one seam all of our code goes
 * through (`private readonly logger = new Logger(Xxx.name)`), whatever logger
 * instance Nest happens to have installed.
 *
 * Plain assignment rather than `jest.spyOn`, so `jest.restoreAllMocks()` inside
 * a spec cannot bring the noise back. Specs that need to assert on logging can
 * still spy on `Logger.prototype` themselves — the spy wraps these no-ops.
 */
const SILENCED_METHODS = [
  "log",
  "error",
  "warn",
  "debug",
  "verbose",
  "fatal",
] as const satisfies readonly (keyof Logger)[];

for (const method of SILENCED_METHODS) {
  Logger.prototype[method] = () => undefined;
}
