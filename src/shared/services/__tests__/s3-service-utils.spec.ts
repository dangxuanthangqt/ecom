import { promises as fs } from "fs";

import { BadRequestException, NotFoundException } from "@nestjs/common";

import { S3Service } from "../s3.service";

import {
  setupS3Service,
  S3ServiceMocks,
  makeBuffer,
} from "./s3-service-test-harness";

interface CommandWithInput {
  input: Record<string, unknown>;
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
  getSignedUrl: jest.fn(),
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

const createReadStream = jest.mocked(require("fs")).createReadStream;
const { Upload } = jest.mocked(require("@aws-sdk/lib-storage"));

describe("S3Service - utility functions and error paths", () => {
  let service: S3Service;
  let mocks: S3ServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupS3Service());
    jest.clearAllMocks();
  });

  describe("validateFileBeforeUpload", () => {
    it("rejects empty files", async () => {
      // Arrange
      const filePath = "/tmp/empty.txt";
      (fs.stat as jest.Mock).mockResolvedValue({
        size: 0,
        isFile: () => true,
      });

      // Act & Assert
      await expect(
        service.uploadSimpleFileFromDisk({
          filePath,
          fileName: "empty.txt",
          mimeType: "text/plain",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects non-file paths (directories)", async () => {
      // Arrange
      const dirPath = "/tmp/directory";
      (fs.stat as jest.Mock).mockResolvedValue({
        size: 1024,
        isFile: () => false,
      });

      // Act & Assert
      await expect(
        service.uploadSimpleFileFromDisk({
          filePath: dirPath,
          fileName: "dir",
          mimeType: "text/plain",
        }),
      ).rejects.toThrow();
    });

    it("rejects when file stat throws error", async () => {
      // Arrange
      const filePath = "/nonexistent/path.txt";
      (fs.stat as jest.Mock).mockRejectedValue(
        new Error("ENOENT: no such file or directory"),
      );

      // Act & Assert
      await expect(
        service.uploadSimpleFileFromDisk({
          filePath,
          fileName: "nonexistent.txt",
          mimeType: "text/plain",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("accepts valid files with large sizes", async () => {
      // Arrange
      const filePath = "/tmp/large.bin";
      (fs.stat as jest.Mock).mockResolvedValue({
        size: 500 * 1024 * 1024, // 500MB
        isFile: () => true,
      });
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      const mockStream = {
        pipe: jest.fn().mockReturnThis(),
        on: jest.fn().mockReturnThis(),
      };
      createReadStream.mockReturnValue(mockStream);

      mocks.send.mockResolvedValue({ ETag: '"large123"' });

      // Act
      const result = await service.uploadSimpleFileFromDisk({
        filePath,
        fileName: "large.bin",
        mimeType: "application/octet-stream",
      });

      // Assert
      expect(result.url).toBeTruthy();
    });
  });

  describe("cleanupTempFile", () => {
    it("attempts to unlink temp file after successful upload", async () => {
      // Arrange
      const filePath = "/tmp/test-cleanup.jpg";
      (fs.stat as jest.Mock).mockResolvedValue({
        size: 1024,
        isFile: () => true,
      });
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      createReadStream.mockReturnValue({
        on: jest.fn().mockReturnThis(),
      });

      mocks.send.mockResolvedValue({ ETag: '"abc"' });

      // Act
      await service.uploadSimpleFileFromDisk({
        filePath,
        fileName: "test.jpg",
        mimeType: "image/jpeg",
        cleanup: true,
      });

      // Assert
      expect(fs.unlink).toHaveBeenCalledWith(filePath);
    });

    it("continues gracefully when cleanup unlink fails", async () => {
      // Arrange
      const filePath = "/tmp/cleanup-fail.jpg";
      (fs.stat as jest.Mock).mockResolvedValue({
        size: 1024,
        isFile: () => true,
      });
      (fs.unlink as jest.Mock).mockRejectedValue(
        new Error("Permission denied"),
      );

      createReadStream.mockReturnValue({
        on: jest.fn().mockReturnThis(),
      });

      mocks.send.mockResolvedValue({ ETag: '"abc"' });

      // Act
      const result = await service.uploadSimpleFileFromDisk({
        filePath,
        fileName: "test.jpg",
        mimeType: "image/jpeg",
        cleanup: true,
      });

      // Assert - upload succeeded even though cleanup failed
      expect(result.url).toBeTruthy();
      expect(fs.unlink).toHaveBeenCalledWith(filePath);
    });

    it("does not call cleanup when cleanup flag is false", async () => {
      // Arrange
      const filePath = "/tmp/no-cleanup.jpg";
      (fs.stat as jest.Mock).mockResolvedValue({
        size: 1024,
        isFile: () => true,
      });

      createReadStream.mockReturnValue({
        on: jest.fn().mockReturnThis(),
      });

      mocks.send.mockResolvedValue({ ETag: '"abc"' });

      // Act
      await service.uploadSimpleFileFromDisk({
        filePath,
        fileName: "test.jpg",
        mimeType: "image/jpeg",
        cleanup: false,
      });

      // Assert
      expect(fs.unlink).not.toHaveBeenCalled();
    });
  });

  describe("getPublicUrl", () => {
    it("constructs correct public URL for simple key", async () => {
      // Arrange
      const filePath = "/tmp/test.jpg";
      (fs.stat as jest.Mock).mockResolvedValue({
        size: 1024,
        isFile: () => true,
      });

      createReadStream.mockReturnValue({
        on: jest.fn().mockReturnThis(),
      });

      mocks.send.mockResolvedValue({ ETag: '"test"' });

      // Act
      const result = await service.uploadSimpleFileFromDisk({
        filePath,
        fileName: "test.jpg",
        mimeType: "image/jpeg",
        folder: "images",
      });

      // Assert
      expect(result.url).toMatch(
        /https:\/\/test-bucket\.s3\.us-east-1\.amazonaws\.com\/images\//,
      );
    });

    it("includes bucket name from config in URL", async () => {
      // Arrange
      const filePath = "/tmp/config-test.jpg";
      (fs.stat as jest.Mock).mockResolvedValue({
        size: 1024,
        isFile: () => true,
      });

      createReadStream.mockReturnValue({
        on: jest.fn().mockReturnThis(),
      });

      mocks.send.mockResolvedValue({ ETag: '"config"' });

      // Act
      const result = await service.uploadSimpleFileFromDisk({
        filePath,
        fileName: "config.jpg",
        mimeType: "image/jpeg",
      });

      // Assert
      expect(result.url).toContain("test-bucket");
    });

    it("includes region from config in URL", async () => {
      // Arrange
      const filePath = "/tmp/region.jpg";
      (fs.stat as jest.Mock).mockResolvedValue({
        size: 1024,
        isFile: () => true,
      });

      createReadStream.mockReturnValue({
        on: jest.fn().mockReturnThis(),
      });

      mocks.send.mockResolvedValue({ ETag: '"region"' });

      // Act
      const result = await service.uploadSimpleFileFromDisk({
        filePath,
        fileName: "region.jpg",
        mimeType: "image/jpeg",
      });

      // Assert
      expect(result.url).toContain("us-east-1");
    });
  });

  describe("file name uniqueness", () => {
    it("appends timestamp to generate unique file names", async () => {
      // Arrange
      const filePath = "/tmp/unique.jpg";
      (fs.stat as jest.Mock).mockResolvedValue({
        size: 1024,
        isFile: () => true,
      });

      createReadStream.mockReturnValue({
        on: jest.fn().mockReturnThis(),
      });

      mocks.send.mockResolvedValue({ ETag: '"unique1"' });

      // Act
      const result = await service.uploadSimpleFileFromDisk({
        filePath,
        fileName: "photo.jpg",
        mimeType: "image/jpeg",
      });

      // Assert
      expect(result.url).toMatch(/photo_\d+\.jpg/);
    });

    it("preserves file extension in generated name", async () => {
      // Arrange
      const filePath = "/tmp/extension.pdf";
      (fs.stat as jest.Mock).mockResolvedValue({
        size: 2048,
        isFile: () => true,
      });

      createReadStream.mockReturnValue({
        on: jest.fn().mockReturnThis(),
      });

      mocks.send.mockResolvedValue({ ETag: '"ext"' });

      // Act
      const result = await service.uploadSimpleFileFromDisk({
        filePath,
        fileName: "document.pdf",
        mimeType: "application/pdf",
      });

      // Assert
      expect(result.url).toMatch(/\.pdf$/);
    });

    it("handles files with multiple dots in name", async () => {
      // Arrange
      const filePath = "/tmp/multi.dot.test.jpg";
      (fs.stat as jest.Mock).mockResolvedValue({
        size: 1024,
        isFile: () => true,
      });

      createReadStream.mockReturnValue({
        on: jest.fn().mockReturnThis(),
      });

      mocks.send.mockResolvedValue({ ETag: '"multi"' });

      // Act
      const result = await service.uploadSimpleFileFromDisk({
        filePath,
        fileName: "archive.tar.gz",
        mimeType: "application/gzip",
      });

      // Assert
      expect(result.url).toMatch(/archive\.tar_\d+\.gz/);
    });
  });

  describe("S3 ServerSideEncryption", () => {
    it("sets AES256 encryption on all uploads", async () => {
      // Arrange
      const buffer = makeBuffer(1024);
      mocks.send.mockResolvedValue({ ETag: '"enc"' });

      // Act
      await service.uploadFileFromBuffer({
        buffer,
        fileName: "encrypted.txt",
        mimeType: "text/plain",
      });

      // Assert
      const callArg = mocks.send.mock.calls[0]?.[0] as
        | CommandWithInput
        | undefined;
      expect((callArg?.input as Record<string, unknown>)?.ServerSideEncryption).toBe(
        "AES256",
      );
    });

    it("sets encryption on multipart uploads", async () => {
      // Arrange
      const buffer = makeBuffer(110 * 1024 * 1024);
      const mockUpload = {
        done: jest.fn().mockResolvedValue({ Location: "s3://bucket/file" }),
        on: jest.fn().mockReturnThis(),
      };
      Upload.mockImplementation(() => mockUpload);

      // Act
      await service.uploadLargeFileFromBuffer({
        buffer,
        fileName: "encrypted.bin",
        mimeType: "application/octet-stream",
      });

      // Assert
      const uploadCall = Upload.mock.calls[0][0];
      expect(uploadCall.params.ServerSideEncryption).toBe("AES256");
    });
  });

  describe("metadata handling", () => {
    it("includes originalName in upload metadata", async () => {
      // Arrange
      const buffer = makeBuffer(512);
      const fileName = "my-file.txt";
      mocks.send.mockResolvedValue({ ETag: '"meta"' });

      // Act
      await service.uploadFileFromBuffer({
        buffer,
        fileName,
        mimeType: "text/plain",
      });

      // Assert
      const callArg = mocks.send.mock.calls[0]?.[0] as
        | CommandWithInput
        | undefined;
      const metadata = (callArg?.input as Record<string, unknown>)
        ?.Metadata as Record<string, unknown> | undefined;
      expect(metadata?.originalName).toBe(fileName);
    });

    it("includes uploadedAt timestamp in metadata", async () => {
      // Arrange
      const buffer = makeBuffer(512);
      mocks.send.mockResolvedValue({ ETag: '"timestamp"' });

      // Act
      await service.uploadFileFromBuffer({
        buffer,
        fileName: "timestamped.txt",
        mimeType: "text/plain",
      });

      // Assert
      const callArg = mocks.send.mock.calls[0]?.[0] as
        | CommandWithInput
        | undefined;
      const metadata = (callArg?.input as Record<string, unknown>)
        ?.Metadata as Record<string, unknown> | undefined;
      expect(metadata?.uploadedAt).toBeTruthy();
      expect(new Date(metadata?.uploadedAt as string)).toBeInstanceOf(Date);
    });
  });

  describe("custom folder paths", () => {
    it("uses default images folder when not provided", async () => {
      // Arrange
      const buffer = makeBuffer(512);
      mocks.send.mockResolvedValue({ ETag: '"default"' });

      // Act
      await service.uploadFileFromBuffer({
        buffer,
        fileName: "default-folder.jpg",
        mimeType: "image/jpeg",
      });

      // Assert
      const callArg = mocks.send.mock.calls[0]?.[0] as
        | CommandWithInput
        | undefined;
      expect((callArg?.input as Record<string, unknown>)?.Key).toContain("images/");
    });

    it("respects custom folder when provided", async () => {
      // Arrange
      const buffer = makeBuffer(512);
      mocks.send.mockResolvedValue({ ETag: '"custom"' });

      // Act
      await service.uploadFileFromBuffer({
        buffer,
        fileName: "custom.pdf",
        mimeType: "application/pdf",
        folder: "documents",
      });

      // Assert
      const callArg = mocks.send.mock.calls[0]?.[0] as
        | CommandWithInput
        | undefined;
      expect((callArg?.input as Record<string, unknown>)?.Key).toContain("documents/");
    });

    it("allows arbitrary folder paths", async () => {
      // Arrange
      const buffer = makeBuffer(512);
      mocks.send.mockResolvedValue({ ETag: '"arbitrary"' });

      // Act
      await service.uploadFileFromBuffer({
        buffer,
        fileName: "report.xlsx",
        mimeType: "application/vnd.ms-excel",
        folder: "reports/2024/q1",
      });

      // Assert
      const callArg = mocks.send.mock.calls[0]?.[0] as
        | CommandWithInput
        | undefined;
      expect((callArg?.input as Record<string, unknown>)?.Key).toContain(
        "reports/2024/q1/",
      );
    });
  });

  describe("content type handling", () => {
    it("respects provided content type", async () => {
      // Arrange
      const buffer = makeBuffer(512);
      const mimeType = "text/csv";
      mocks.send.mockResolvedValue({ ETag: '"mime"' });

      // Act
      await service.uploadFileFromBuffer({
        buffer,
        fileName: "data.csv",
        mimeType,
      });

      // Assert
      const callArg = mocks.send.mock.calls[0]?.[0] as
        | CommandWithInput
        | undefined;
      expect((callArg?.input as Record<string, unknown>)?.ContentType).toBe(mimeType);
    });

    it("preserves content type through upload process", async () => {
      // Arrange
      const filePath = "/tmp/content-type.json";
      (fs.stat as jest.Mock).mockResolvedValue({
        size: 1024,
        isFile: () => true,
      });

      createReadStream.mockReturnValue({
        on: jest.fn().mockReturnThis(),
      });

      mocks.send.mockResolvedValue({ ETag: '"json"' });

      // Act
      await service.uploadSimpleFileFromDisk({
        filePath,
        fileName: "config.json",
        mimeType: "application/json",
      });

      // Assert
      const callArg = mocks.send.mock.calls[0]?.[0] as
        | CommandWithInput
        | undefined;
      expect((callArg?.input as Record<string, unknown>)?.ContentType).toBe(
        "application/json",
      );
    });
  });
});
