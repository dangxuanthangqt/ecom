import {
  DEFAULT_APP_ENV,
  resolveEnvFilePath,
} from "@/constants/env-file.constant";

describe("resolveEnvFilePath", () => {
  it("maps each environment to its own file", () => {
    expect(resolveEnvFilePath("development")).toBe(".env.development");
    expect(resolveEnvFilePath("test")).toBe(".env.test");
    expect(resolveEnvFilePath("production")).toBe(".env");
  });

  it("falls back to development when NODE_ENV is blank", () => {
    expect(DEFAULT_APP_ENV).toBe("development");
    expect(resolveEnvFilePath("")).toBe(".env.development");
    expect(resolveEnvFilePath("   ")).toBe(".env.development");
  });

  // `nest start` without NODE_ENV must not end up reading `.env.undefined`.
  it("reads process.env.NODE_ENV when no argument is given", () => {
    const previous = process.env.NODE_ENV;

    try {
      process.env.NODE_ENV = "production";
      expect(resolveEnvFilePath()).toBe(".env");

      delete process.env.NODE_ENV;
      expect(resolveEnvFilePath()).toBe(".env.development");
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  // A typo'd NODE_ENV must not quietly fall back to another environment's file.
  it("throws on an unknown environment", () => {
    expect(() => resolveEnvFilePath("staging")).toThrow(
      /Unknown NODE_ENV "staging"/,
    );
  });
});
