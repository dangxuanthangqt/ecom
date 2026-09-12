import { Readable } from "stream";

import { BadRequestException } from "@nestjs/common";

import { ImageValidationPipe } from "../image-validation.pipe";

/**
 * A deliberately ill-typed value, for the tests that exercise the pipe's
 * runtime guards against input TypeScript would never allow.
 */
const invalid = <T = never>(value: unknown): T => value as T;

describe("ImageValidationPipe", () => {
  let pipe: ImageValidationPipe;

  const createMockFile = (
    overrides: Partial<Express.Multer.File> = {},
  ): Express.Multer.File => ({
    fieldname: "file",
    originalname: "test.jpg",
    encoding: "7bit",
    mimetype: "image/jpeg",
    size: 1024,
    destination: "/uploads",
    filename: "test_123456.jpg",
    path: "/uploads/test_123456.jpg",
    buffer: Buffer.alloc(1024),
    stream: null as unknown as Readable,
    ...overrides,
  });

  beforeEach(() => {
    pipe = new ImageValidationPipe();
  });

  describe("successful validation", () => {
    it("accepts valid JPEG file", () => {
      // Arrange
      const file = createMockFile({
        originalname: "image.jpg",
        mimetype: "image/jpeg",
        size: 2048,
      });

      // Act
      const result = pipe.transform(file);

      // Assert
      expect(result).toBeUndefined(); // Pipe returns void on success
    });

    it("accepts valid PNG file", () => {
      // Arrange
      const file = createMockFile({
        originalname: "image.png",
        mimetype: "image/png",
      });

      // Act
      const result = pipe.transform(file);

      // Assert
      expect(result).toBeUndefined();
    });

    it("accepts valid WebP file", () => {
      // Arrange
      const file = createMockFile({
        originalname: "image.webp",
        mimetype: "image/webp",
      });

      // Act
      const result = pipe.transform(file);

      // Assert
      expect(result).toBeUndefined();
    });

    it("accepts valid GIF file", () => {
      // Arrange
      const file = createMockFile({
        originalname: "image.gif",
        mimetype: "image/gif",
      });

      // Act
      const result = pipe.transform(file);

      // Assert
      expect(result).toBeUndefined();
    });

    it("accepts valid SVG file", () => {
      // Arrange
      const file = createMockFile({
        originalname: "image.svg",
        mimetype: "image/svg+xml",
      });

      // Act
      const result = pipe.transform(file);

      // Assert
      expect(result).toBeUndefined();
    });

    it("accepts file at minimum size", () => {
      // Arrange
      const file = createMockFile({
        size: 1024, // 1KB - minimum
      });

      // Act
      const result = pipe.transform(file);

      // Assert
      expect(result).toBeUndefined();
    });

    it("accepts file at maximum size", () => {
      // Arrange
      const file = createMockFile({
        size: 5 * 1024 * 1024, // 5MB - maximum
      });

      // Act
      const result = pipe.transform(file);

      // Assert
      expect(result).toBeUndefined();
    });

    it("accepts JPEG extension (uppercase)", () => {
      // Arrange
      const file = createMockFile({
        originalname: "IMAGE.JPEG",
        mimetype: "image/jpeg",
      });

      // Act
      const result = pipe.transform(file);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe("file presence validation", () => {
    it("throws BadRequestException when file is undefined", () => {
      // Arrange & Act & Assert
      expect(() => pipe.transform(invalid(undefined))).toThrow(
        BadRequestException,
      );
      expect(() => pipe.transform(invalid(undefined))).toThrow(
        "File is required",
      );
    });

    it("throws BadRequestException when file is null", () => {
      // Arrange & Act & Assert
      expect(() => pipe.transform(invalid(null))).toThrow(BadRequestException);
    });
  });

  describe("file size validation", () => {
    it("throws BadRequestException when file exceeds 5MB", () => {
      // Arrange
      const file = createMockFile({
        size: 5 * 1024 * 1024 + 1, // 5MB + 1 byte
      });

      // Act & Assert
      expect(() => pipe.transform(file)).toThrow(BadRequestException);
      expect(() => pipe.transform(file)).toThrow("File too large");
    });

    it("throws BadRequestException when file is smaller than 1KB", () => {
      // Arrange
      const file = createMockFile({
        size: 1023, // Less than 1KB
      });

      // Act & Assert
      expect(() => pipe.transform(file)).toThrow(BadRequestException);
      expect(() => pipe.transform(file)).toThrow("File too small");
    });

    it("throws error with correct size in message", () => {
      // Arrange
      const file = createMockFile({
        size: 10 * 1024 * 1024, // 10MB
      });

      // Act & Assert
      expect(() => pipe.transform(file)).toThrow("5MB");
    });
  });

  describe("MIME type validation", () => {
    it("throws BadRequestException for unsupported MIME type", () => {
      // Arrange
      const file = createMockFile({
        mimetype: "image/tiff",
      });

      // Act & Assert
      expect(() => pipe.transform(file)).toThrow(BadRequestException);
      expect(() => pipe.transform(file)).toThrow("Invalid file type");
    });

    it("throws BadRequestException for non-image MIME type", () => {
      // Arrange
      const file = createMockFile({
        mimetype: "video/mp4",
      });

      // Act & Assert
      expect(() => pipe.transform(file)).toThrow(BadRequestException);
    });

    it("throws BadRequestException for document MIME type", () => {
      // Arrange
      const file = createMockFile({
        mimetype: "application/pdf",
      });

      // Act & Assert
      expect(() => pipe.transform(file)).toThrow(BadRequestException);
    });

    it("includes allowed types in error message", () => {
      // Arrange
      const file = createMockFile({
        mimetype: "text/plain",
      });

      // Act & Assert
      expect(() => pipe.transform(file)).toThrow("image/jpeg");
      expect(() => pipe.transform(file)).toThrow("image/png");
    });
  });

  describe("filename validation", () => {
    it("throws BadRequestException when originalname is missing", () => {
      // Arrange
      const file = createMockFile({
        originalname: "",
      });

      // Act & Assert
      expect(() => pipe.transform(file)).toThrow(BadRequestException);
      expect(() => pipe.transform(file)).toThrow("File must have a name");
    });

    it("throws BadRequestException when originalname is null", () => {
      // Arrange
      const file = createMockFile({
        originalname: invalid(null),
      });

      // Act & Assert
      expect(() => pipe.transform(file)).toThrow(BadRequestException);
    });
  });

  describe("file extension validation", () => {
    it("throws BadRequestException for invalid extension", () => {
      // Arrange
      const file = createMockFile({
        originalname: "document.txt",
        mimetype: "image/jpeg",
      });

      // Act & Assert
      expect(() => pipe.transform(file)).toThrow(BadRequestException);
      expect(() => pipe.transform(file)).toThrow("Invalid file extension");
    });

    it("throws BadRequestException for executable extension", () => {
      // Arrange
      const file = createMockFile({
        originalname: "virus.exe",
        mimetype: "image/jpeg",
      });

      // Act & Assert
      expect(() => pipe.transform(file)).toThrow(BadRequestException);
    });

    it("accepts lowercase and uppercase extensions", () => {
      // Arrange
      const file1 = createMockFile({ originalname: "image.JPG" });
      const file2 = createMockFile({ originalname: "image.jpg" });

      // Act & Assert
      expect(() => pipe.transform(file1)).not.toThrow();
      expect(() => pipe.transform(file2)).not.toThrow();
    });

    it("handles file with multiple dots in name", () => {
      // Arrange
      const file = createMockFile({
        originalname: "my.image.file.jpg",
        mimetype: "image/jpeg",
      });

      // Act
      const result = pipe.transform(file);

      // Assert
      expect(result).toBeUndefined();
    });

    it("rejects file without extension", () => {
      // Arrange
      const file = createMockFile({
        originalname: "imagefile",
        mimetype: "image/jpeg",
      });

      // Act & Assert
      expect(() => pipe.transform(file)).toThrow("Invalid file extension");
    });

    it("includes allowed extensions in error message", () => {
      // Arrange
      const file = createMockFile({
        originalname: "image.tiff",
        mimetype: "image/jpeg",
      });

      // Act & Assert
      expect(() => pipe.transform(file)).toThrow(".jpg");
      expect(() => pipe.transform(file)).toThrow(".png");
    });
  });

  describe("combined validation scenarios", () => {
    it("validates size and MIME type together", () => {
      // Arrange - Wrong MIME type, but size within limits
      const file = createMockFile({
        mimetype: "text/plain",
        size: 2 * 1024 * 1024, // Within 5MB limit
      });

      // Act & Assert
      expect(() => pipe.transform(file)).toThrow("Invalid file type");
    });

    it("validates extension and MIME type match", () => {
      // Arrange - JPEG extension but PNG MIME type
      const file = createMockFile({
        originalname: "image.jpg",
        mimetype: "image/png",
      });

      // Act
      const result = pipe.transform(file);

      // Assert - Should pass (only checks extension syntax, not magic bytes)
      expect(result).toBeUndefined();
    });

    it("rejects empty file with correct message", () => {
      // Arrange
      const file = createMockFile({
        size: 0,
      });

      // Act & Assert
      expect(() => pipe.transform(file)).toThrow("File too small");
    });

    it("rejects file with spaces only as name", () => {
      // Arrange - spaces-only name has no extension, fails extension check
      const file = createMockFile({
        originalname: "   ",
        mimetype: "image/jpeg",
      });

      // Act & Assert
      expect(() => pipe.transform(file)).toThrow("Invalid file extension");
    });
  });
});
