import { VerificationCodeRepository } from "../verification-code.repository";

import {
  setupVerificationCodeRepository,
  VERIFICATION_CODE,
  EMAIL,
  CODE_TYPE,
  makeVerificationCode,
  containing,
  VerificationCodeRepositoryMocks,
  createPrismaUniqueError,
  createPrismaNotFoundError,
  anyDate,
} from "./verification-code-repository-test-harness";

describe("VerificationCodeRepository - deleteVerificationCode", () => {
  let repository: VerificationCodeRepository;
  let mocks: VerificationCodeRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupVerificationCodeRepository());
  });

  it("deletes verification codes by provided criteria", async () => {
    // Arrange
    mocks.prismaService.verificationCode.deleteMany.mockResolvedValue(
      undefined,
    );

    // Act
    await repository.deleteVerificationCode({
      where: { email: EMAIL },
    });

    // Assert
    expect(
      mocks.prismaService.verificationCode.deleteMany,
    ).toHaveBeenCalledWith({
      where: { email: EMAIL },
    });
  });

  it("throws NotFoundException when verification code not found", async () => {
    // Arrange
    mocks.prismaService.verificationCode.deleteMany.mockRejectedValue(
      createPrismaNotFoundError(),
    );

    // Act
    const promise = repository.deleteVerificationCode({
      where: { email: "nonexistent@example.com" },
    });

    // Assert
    await expect(promise).rejects.toThrow();
    await expect(promise).rejects.toMatchObject({
      response: containing({
        message: "Verification code not found.",
      }),
    });
  });

  it("throws InternalServerErrorException on other errors", async () => {
    // Arrange
    mocks.prismaService.verificationCode.deleteMany.mockRejectedValue(
      new Error("Database error"),
    );

    // Act
    const promise = repository.deleteVerificationCode({
      where: { email: EMAIL },
    });

    // Assert
    await expect(promise).rejects.toThrow();
  });
});

describe("VerificationCodeRepository - createVerificationCode", () => {
  let repository: VerificationCodeRepository;
  let mocks: VerificationCodeRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupVerificationCodeRepository());
  });

  it("creates a new verification code via upsert", async () => {
    // Arrange
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const verificationCode = makeVerificationCode({ expiresAt });
    mocks.prismaService.verificationCode.upsert.mockResolvedValue(
      verificationCode,
    );

    // Act
    const result = await repository.createVerificationCode({
      code: VERIFICATION_CODE,
      email: EMAIL,
      type: CODE_TYPE,
      expiresAt,
    });

    // Assert
    expect(mocks.prismaService.verificationCode.upsert).toHaveBeenCalledWith({
      where: {
        email_code_type: {
          email: EMAIL,
          code: VERIFICATION_CODE,
          type: CODE_TYPE,
        },
      },
      create: {
        code: VERIFICATION_CODE,
        email: EMAIL,
        type: CODE_TYPE,
        expiresAt,
      },
      update: {
        code: VERIFICATION_CODE,
        type: CODE_TYPE,
        expiresAt,
      },
    });
    expect(result).toEqual(verificationCode);
  });

  it("updates existing verification code when composite key matches", async () => {
    // Arrange
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const verificationCode = makeVerificationCode({ expiresAt });
    mocks.prismaService.verificationCode.upsert.mockResolvedValue(
      verificationCode,
    );

    // Act
    const result = await repository.createVerificationCode({
      code: VERIFICATION_CODE,
      email: EMAIL,
      type: CODE_TYPE,
      expiresAt,
    });

    // Assert
    expect(result).toEqual(verificationCode);
    expect(mocks.prismaService.verificationCode.upsert).toHaveBeenCalled();
  });

  it("throws UnprocessableEntityException on unique constraint violation", async () => {
    // Arrange
    mocks.prismaService.verificationCode.upsert.mockRejectedValue(
      createPrismaUniqueError(),
    );

    // Act
    const promise = repository.createVerificationCode({
      code: VERIFICATION_CODE,
      email: EMAIL,
      type: CODE_TYPE,
      expiresAt: new Date(),
    });

    // Assert
    await expect(promise).rejects.toThrow();
    await expect(promise).rejects.toMatchObject({
      response: containing({
        message: "Verification code already exists.",
      }),
    });
  });

  it("throws InternalServerErrorException on other errors", async () => {
    // Arrange
    mocks.prismaService.verificationCode.upsert.mockRejectedValue(
      new Error("Unexpected error"),
    );

    // Act
    const promise = repository.createVerificationCode({
      code: VERIFICATION_CODE,
      email: EMAIL,
      type: CODE_TYPE,
      expiresAt: new Date(),
    });

    // Assert
    await expect(promise).rejects.toThrow();
  });
});

describe("VerificationCodeRepository - findUnique", () => {
  let repository: VerificationCodeRepository;
  let mocks: VerificationCodeRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupVerificationCodeRepository());
  });

  it("finds a verification code by composite key", async () => {
    // Arrange
    const verificationCode = makeVerificationCode();
    mocks.prismaService.verificationCode.findUnique.mockResolvedValue(
      verificationCode,
    );

    // Act
    const result = await repository.findUnique({
      where: {
        email_code_type: {
          email: EMAIL,
          code: VERIFICATION_CODE,
          type: CODE_TYPE,
        },
      },
    });

    // Assert
    expect(
      mocks.prismaService.verificationCode.findUnique,
    ).toHaveBeenCalledWith({
      where: {
        email_code_type: {
          email: EMAIL,
          code: VERIFICATION_CODE,
          type: CODE_TYPE,
        },
      },
    });
    expect(result).toEqual(verificationCode);
  });

  it("returns null when verification code not found", async () => {
    // Arrange
    mocks.prismaService.verificationCode.findUnique.mockResolvedValue(null);

    // Act
    const result = await repository.findUnique({
      where: {
        email_code_type: {
          email: "nonexistent@example.com",
          code: "000000",
          type: CODE_TYPE,
        },
      },
    });

    // Assert
    expect(result).toBeNull();
  });

  it("throws InternalServerErrorException on database error", async () => {
    // Arrange
    mocks.prismaService.verificationCode.findUnique.mockRejectedValue(
      new Error("Database error"),
    );

    // Act
    const promise = repository.findUnique({
      where: {
        email_code_type: {
          email: EMAIL,
          code: VERIFICATION_CODE,
          type: CODE_TYPE,
        },
      },
    });

    // Assert
    await expect(promise).rejects.toThrow();
  });
});

describe("VerificationCodeRepository - findUniqueOrThrow", () => {
  let repository: VerificationCodeRepository;
  let mocks: VerificationCodeRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupVerificationCodeRepository());
  });

  it("finds a verification code by composite key", async () => {
    // Arrange
    const verificationCode = makeVerificationCode();
    mocks.prismaService.verificationCode.findUniqueOrThrow.mockResolvedValue(
      verificationCode,
    );

    // Act
    const result = await repository.findUniqueOrThrow({
      where: {
        email_code_type: {
          email: EMAIL,
          code: VERIFICATION_CODE,
          type: CODE_TYPE,
        },
      },
    });

    // Assert
    expect(
      mocks.prismaService.verificationCode.findUniqueOrThrow,
    ).toHaveBeenCalledWith({
      where: {
        email_code_type: {
          email: EMAIL,
          code: VERIFICATION_CODE,
          type: CODE_TYPE,
        },
      },
    });
    expect(result).toEqual(verificationCode);
  });

  it("throws NotFoundException when verification code not found", async () => {
    // Arrange
    mocks.prismaService.verificationCode.findUniqueOrThrow.mockRejectedValue(
      createPrismaNotFoundError(),
    );

    // Act
    const promise = repository.findUniqueOrThrow({
      where: {
        email_code_type: {
          email: "nonexistent@example.com",
          code: "000000",
          type: CODE_TYPE,
        },
      },
    });

    // Assert
    await expect(promise).rejects.toThrow();
    await expect(promise).rejects.toMatchObject({
      response: containing({
        message: "Verification code not found.",
      }),
    });
  });

  it("throws InternalServerErrorException on other errors", async () => {
    // Arrange
    mocks.prismaService.verificationCode.findUniqueOrThrow.mockRejectedValue(
      new Error("Database error"),
    );

    // Act
    const promise = repository.findUniqueOrThrow({
      where: {
        email_code_type: {
          email: EMAIL,
          code: VERIFICATION_CODE,
          type: CODE_TYPE,
        },
      },
    });

    // Assert
    await expect(promise).rejects.toThrow();
  });
});

describe("VerificationCodeRepository - code expiry handling", () => {
  let repository: VerificationCodeRepository;
  let mocks: VerificationCodeRepositoryMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupVerificationCodeRepository());
  });

  it("creates verification code with future expiry timestamp", async () => {
    // Arrange
    const futureExpiry = new Date(Date.now() + 15 * 60 * 1000);
    const verificationCode = makeVerificationCode({ expiresAt: futureExpiry });
    mocks.prismaService.verificationCode.upsert.mockResolvedValue(
      verificationCode,
    );

    // Act
    const result = await repository.createVerificationCode({
      code: VERIFICATION_CODE,
      email: EMAIL,
      type: CODE_TYPE,
      expiresAt: futureExpiry,
    });

    // Assert
    expect(result.expiresAt).toEqual(futureExpiry);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("handles different verification code types", async () => {
    // Arrange
    const verificationCode = makeVerificationCode({ type: "FORGOT_PASSWORD" });
    mocks.prismaService.verificationCode.upsert.mockResolvedValue(
      verificationCode,
    );

    // Act
    await repository.createVerificationCode({
      code: VERIFICATION_CODE,
      email: EMAIL,
      type: "FORGOT_PASSWORD",
      expiresAt: new Date(),
    });

    // Assert
    expect(mocks.prismaService.verificationCode.upsert).toHaveBeenCalledWith(
      containing({
        where: containing({
          email_code_type: containing({ type: "FORGOT_PASSWORD" }),
        }),
      }),
    );
  });
});
