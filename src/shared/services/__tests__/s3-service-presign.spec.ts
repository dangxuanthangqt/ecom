import { BadRequestException } from "@nestjs/common";
import * as mime from "mime-types";

import { S3Service } from "../s3.service";

import { setupS3Service, S3ServiceMocks } from "./s3-service-test-harness";

interface CommandWithInput {
  input: Record<string, unknown>;
}

interface PresignerModule {
  getSignedUrl: jest.Mock<
    Promise<string>,
    [unknown, unknown, Record<string, unknown>]
  >;
}

interface S3Module {
  S3: jest.Mock;
  DeleteObjectCommand: jest.Mock<CommandWithInput, [unknown]>;
  GetObjectCommand: jest.Mock<CommandWithInput, [unknown]>;
  PutObjectCommand: jest.Mock<CommandWithInput, [unknown]>;
  S3ServiceException: typeof Error;
}

jest.mock("@aws-sdk/client-s3", () => ({
  S3: jest.fn(),
  DeleteObjectCommand: jest.fn(function (
    this: CommandWithInput,
    input: unknown,
  ) {
    this.input = input as Record<string, unknown>;
  }),
  GetObjectCommand: jest.fn(function (this: CommandWithInput, input: unknown) {
    this.input = input as Record<string, unknown>;
  }),
  PutObjectCommand: jest.fn(function (this: CommandWithInput, input: unknown) {
    this.input = input as Record<string, unknown>;
  }),
  S3ServiceException: Error,
}));

jest.mock("@aws-sdk/lib-storage", () => ({
  Upload: jest.fn(),
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn<
    Promise<string>,
    [unknown, unknown, Record<string, unknown>]
  >(),
}));

jest.mock("fs", () => {
  const realFs = jest.requireActual("fs");
  return {
    ...realFs,
    promises: {
      stat: jest.fn<Promise<unknown>, [unknown]>(),
      unlink: jest.fn<Promise<void>, [string]>(),
    },
    createReadStream: jest.fn(),
    statSync: jest.fn(),
  };
});

jest.mock("mime-types", () => ({
  lookup: jest.fn<string | false, [string]>(),
}));

const makeS3Error = (
  code: string,
  statusCode: number,
): Error & { name: string; $metadata: { httpStatusCode: number } } => {
  const error = new Error(code);
  error.name = code;
  (error as unknown as { $metadata: { httpStatusCode: number } }).$metadata = {
    httpStatusCode: statusCode,
  };
  return error as Error & {
    name: string;
    $metadata: { httpStatusCode: number };
  };
};

describe("S3Service - generatePresignedDownloadUrl", () => {
  let service: S3Service;
  let mocks: S3ServiceMocks;
  let getSignedUrl: jest.Mock<
    Promise<string>,
    [unknown, unknown, Record<string, unknown>]
  >;
  let GetObjectCommand: jest.Mock<CommandWithInput, [unknown]>;
  let PutObjectCommand: jest.Mock<CommandWithInput, [unknown]>;

  beforeEach(async () => {
    ({ service, mocks } = await setupS3Service());
    jest.clearAllMocks();
    getSignedUrl = jest.mocked(
      require("@aws-sdk/s3-request-presigner"),
    ).getSignedUrl;
    GetObjectCommand = jest.mocked(
      require("@aws-sdk/client-s3"),
    ).GetObjectCommand;
    PutObjectCommand = jest.mocked(
      require("@aws-sdk/client-s3"),
    ).PutObjectCommand as jest.Mock<CommandWithInput, [unknown]>;
  });

  it("generates a presigned download URL when file does not exist", async () => {
    // Arrange
    const key = "documents/report.pdf";

    // Mock checkFileExists - file does NOT exist
    mocks.send.mockRejectedValueOnce(makeS3Error("NoSuchKey", 404));

    getSignedUrl.mockResolvedValue(
      "https://test-bucket.s3.us-east-1.amazonaws.com/documents/report.pdf?signed",
    );

    // Act
    const result = await service.generatePresignedDownloadUrl({
      key,
      expiresIn: 3600,
    });

    // Assert
    expect(result.downloadUrl).toContain(key);
    expect(result.downloadUrl).toContain("signed");
  });

  it("throws BadRequestException when file already exists", async () => {
    // Arrange
    const key = "documents/existing.pdf";

    // Mock checkFileExists - file DOES exist
    mocks.send.mockResolvedValueOnce({ ContentLength: 2048 });

    // Act & Assert
    await expect(
      service.generatePresignedDownloadUrl({ key, expiresIn: 3600 }),
    ).rejects.toThrow(BadRequestException);
  });

  it("includes expiry time in presigned URL generation", async () => {
    // Arrange
    const key = "reports/data.csv";
    const expiresIn = 7200; // 2 hours

    mocks.send.mockRejectedValueOnce(makeS3Error("NoSuchKey", 404));

    const { getSignedUrl } = jest.mocked(
      require("@aws-sdk/s3-request-presigner"),
    );
    getSignedUrl.mockResolvedValue("https://signed-url");

    // Act
    await service.generatePresignedDownloadUrl({ key, expiresIn });

    // Assert
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        expiresIn: 7200,
      }),
    );
  });

  it("supports custom response content type", async () => {
    // Arrange
    const key = "files/video.mp4";
    const responseContentType = "video/mp4";

    // First send call for checkFileExists (file doesn't exist)
    mocks.send.mockRejectedValueOnce(makeS3Error("NoSuchKey", 404));

    const { getSignedUrl: getSignedUrlMock } = jest.mocked(
      require("@aws-sdk/s3-request-presigner"),
    );
    getSignedUrlMock.mockResolvedValue("https://signed-url");
    // Act
    await service.generatePresignedDownloadUrl({
      key,
      responseContentType,
    });

    // Assert - check the second GetObjectCommand call (the one with ResponseContentType)
    // First call is from checkFileExists, second is from presigned URL generation
    const GetObjectCommandMock = jest.mocked(
      require("@aws-sdk/client-s3"),
    ).GetObjectCommand as jest.Mock<CommandWithInput, [unknown]>;
    const input = GetObjectCommandMock.mock.calls[1]?.[0];
    expect((input as Record<string, unknown>)?.ResponseContentType).toBe(responseContentType);
  });

  it("supports custom response content disposition", async () => {
    // Arrange
    const key = "downloads/file.zip";
    const responseContentDisposition = 'attachment; filename="archive.zip"';

    mocks.send.mockRejectedValueOnce(makeS3Error("NoSuchKey", 404));

    const { getSignedUrl: getSignedUrlMock } = jest.mocked(
      require("@aws-sdk/s3-request-presigner"),
    );
    getSignedUrlMock.mockResolvedValue("https://signed-url");
    // Act
    await service.generatePresignedDownloadUrl({
      key,
      responseContentDisposition,
    });

    // Assert
    const GetObjectCommandMock = jest.mocked(
      require("@aws-sdk/client-s3"),
    ).GetObjectCommand as jest.Mock<CommandWithInput, [unknown]>;
    const input = GetObjectCommandMock.mock.calls[1]?.[0];
    expect((input as Record<string, unknown>)?.ResponseContentDisposition).toBe(
      responseContentDisposition,
    );
  });

  it("uses default 3600 seconds expiry when not specified", async () => {
    // Arrange
    const key = "files/document.pdf";

    mocks.send.mockRejectedValueOnce(makeS3Error("NoSuchKey", 404));

    const { getSignedUrl } = jest.mocked(
      require("@aws-sdk/s3-request-presigner"),
    );
    getSignedUrl.mockResolvedValue("https://signed-url");

    // Act
    await service.generatePresignedDownloadUrl({ key });

    // Assert
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        expiresIn: 3600,
      }),
    );
  });

  it("throws error when getSignedUrl fails", async () => {
    // Arrange
    const key = "files/test.pdf";

    mocks.send.mockRejectedValueOnce(makeS3Error("NoSuchKey", 404));

    const { getSignedUrl } = jest.mocked(
      require("@aws-sdk/s3-request-presigner"),
    );
    getSignedUrl.mockRejectedValue(new Error("Signing failed"));

    // Act & Assert
    await expect(
      service.generatePresignedDownloadUrl({ key }),
    ).rejects.toThrow();
  });
});

describe("S3Service - generatePresignedUploadUrl", () => {
  let service: S3Service;
  let mocks: S3ServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupS3Service());
    jest.clearAllMocks();
  });

  it("generates a presigned upload URL when file does not exist", async () => {
    // Arrange
    const key = "uploads/image.jpg";

    // Mock checkFileExists - file does NOT exist
    mocks.send.mockRejectedValueOnce(makeS3Error("NoSuchKey", 404));

    (mime.lookup as jest.Mock<string | false, [string]>).mockReturnValue(
      "image/jpeg",
    );

    const { getSignedUrl } = jest.mocked(
      require("@aws-sdk/s3-request-presigner"),
    );
    getSignedUrl.mockResolvedValue(
      "https://test-bucket.s3.us-east-1.amazonaws.com/uploads/image.jpg?signed",
    );

    // Act
    const result = await service.generatePresignedUploadUrl({
      key,
      expiresIn: 3600,
    });

    // Assert
    expect(result.uploadUrl).toContain(key);
    expect(result.uploadUrl).toContain("signed");
  });

  it("throws BadRequestException when file already exists", async () => {
    // Arrange
    const key = "uploads/existing.jpg";

    // Mock checkFileExists - file DOES exist
    mocks.send.mockResolvedValueOnce({ ContentLength: 1024 });
    (mime.lookup as jest.Mock<string | false, [string]>).mockReturnValue(
      "image/jpeg",
    );

    // Act & Assert
    await expect(service.generatePresignedUploadUrl({ key })).rejects.toThrow(
      BadRequestException,
    );
  });

  it("detects mime type from file extension", async () => {
    // Arrange
    const key = "uploads/document.pdf";

    mocks.send.mockRejectedValueOnce(makeS3Error("NoSuchKey", 404));

    (mime.lookup as jest.Mock<string | false, [string]>).mockReturnValue(
      "application/pdf",
    );

    const { getSignedUrl } = jest.mocked(
      require("@aws-sdk/s3-request-presigner"),
    );
    getSignedUrl.mockResolvedValue("https://signed-url");
    // Act
    await service.generatePresignedUploadUrl({ key });

    // Assert
    expect(mime.lookup).toHaveBeenCalledWith(key);
    const PutObjCmd = jest.mocked(
      require("@aws-sdk/client-s3"),
    ).PutObjectCommand as jest.Mock<CommandWithInput, [unknown]>;
    const input = PutObjCmd.mock.calls[0]?.[0];
    expect((input as Record<string, unknown>)?.ContentType).toBe("application/pdf");
  });

  it("uses octet-stream when mime type cannot be detected", async () => {
    // Arrange
    const key = "uploads/unknown.xyz";

    mocks.send.mockRejectedValueOnce(makeS3Error("NoSuchKey", 404));

    (mime.lookup as jest.Mock<string | false, [string]>).mockReturnValue(false);

    const { getSignedUrl } = jest.mocked(
      require("@aws-sdk/s3-request-presigner"),
    );
    getSignedUrl.mockResolvedValue("https://signed-url");
    // Act
    await service.generatePresignedUploadUrl({ key });

    // Assert
    const PutObjCmd = jest.mocked(
      require("@aws-sdk/client-s3"),
    ).PutObjectCommand as jest.Mock<CommandWithInput, [unknown]>;
    const input = PutObjCmd.mock.calls[0]?.[0];
    expect((input as Record<string, unknown>)?.ContentType).toBe("application/octet-stream");
  });

  it("includes expiry time in upload presigned URL", async () => {
    // Arrange
    const key = "uploads/data.json";
    const expiresIn = 1800; // 30 minutes

    mocks.send.mockRejectedValueOnce(makeS3Error("NoSuchKey", 404));

    (mime.lookup as jest.Mock<string | false, [string]>).mockReturnValue(
      "application/json",
    );

    const { getSignedUrl } = jest.mocked(
      require("@aws-sdk/s3-request-presigner"),
    );
    getSignedUrl.mockResolvedValue("https://signed-url");

    // Act
    await service.generatePresignedUploadUrl({ key, expiresIn });

    // Assert
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        expiresIn: 1800,
      }),
    );
  });

  it("sets metadata in PutObjectCommand", async () => {
    // Arrange
    const key = "uploads/file.txt";

    mocks.send.mockRejectedValueOnce(makeS3Error("NoSuchKey", 404));

    (mime.lookup as jest.Mock<string | false, [string]>).mockReturnValue(
      "text/plain",
    );

    const { getSignedUrl } = jest.mocked(
      require("@aws-sdk/s3-request-presigner"),
    );
    getSignedUrl.mockResolvedValue("https://signed-url");
    // Act
    await service.generatePresignedUploadUrl({ key });

    // Assert
    const PutObjCmd = jest.mocked(
      require("@aws-sdk/client-s3"),
    ).PutObjectCommand as jest.Mock<CommandWithInput, [unknown]>;
    const input = PutObjCmd.mock.calls[0]?.[0];
    const metadata = (input as Record<string, unknown>)?.Metadata as Record<
      string,
      unknown
    > | undefined;
    expect(metadata).toBeDefined();
    expect(metadata?.uploadedAt).toBeTruthy();
  });

  it("uses default 3600 seconds expiry for upload when not specified", async () => {
    // Arrange
    const key = "uploads/default.bin";

    mocks.send.mockRejectedValueOnce(makeS3Error("NoSuchKey", 404));

    (mime.lookup as jest.Mock<string | false, [string]>).mockReturnValue(
      "application/octet-stream",
    );

    const { getSignedUrl } = jest.mocked(
      require("@aws-sdk/s3-request-presigner"),
    );
    getSignedUrl.mockResolvedValue("https://signed-url");

    // Act
    await service.generatePresignedUploadUrl({ key });

    // Assert
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        expiresIn: 3600,
      }),
    );
  });

  it("throws error when getSignedUrl fails during upload URL generation", async () => {
    // Arrange
    const key = "uploads/error.jpg";

    mocks.send.mockRejectedValueOnce(makeS3Error("NoSuchKey", 404));

    (mime.lookup as jest.Mock<string | false, [string]>).mockReturnValue(
      "image/jpeg",
    );

    const { getSignedUrl } = jest.mocked(
      require("@aws-sdk/s3-request-presigner"),
    );
    getSignedUrl.mockRejectedValue(new Error("Signing failed"));

    // Act & Assert
    await expect(service.generatePresignedUploadUrl({ key })).rejects.toThrow();
  });
});
