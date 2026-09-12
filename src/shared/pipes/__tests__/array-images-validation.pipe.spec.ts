import { BadRequestException } from "@nestjs/common";

import { ArrayFilesValidationPipe } from "../array-images-validation.pipe";

/** Assert that a BadRequestException contains an expected message in its response details. */
const expectBadRequest = (fn: () => void, expectedMessage: string) => {
  try {
    fn();
    throw new Error("Expected exception was not thrown");
  } catch (error) {
    if (error instanceof BadRequestException) {
      const response = error.getResponse() as Record<string, unknown>;
      let message: string;

      if (Array.isArray(response.message)) {
        message = response.message.map((m: any) => m.message || m).join(" ");
      } else if (typeof response.message === "string") {
        message = response.message;
      } else {
        message = String(response.message);
      }

      if (message.includes(expectedMessage)) {
        return;
      }
      throw new Error(
        `Expected message to contain "${expectedMessage}", got: "${message}"`,
      );
    }
    throw error;
  }
};

describe("ArrayFilesValidationPipe", () => {
  let pipe: ArrayFilesValidationPipe;

  const createMockFile = (
    overrides: Partial<Express.Multer.File> = {},
  ): Express.Multer.File => ({
    fieldname: "files",
    originalname: "test.jpg",
    encoding: "7bit",
    mimetype: "image/jpeg",
    size: 1024 * 1024, // 1MB
    destination: "/uploads",
    filename: "test_123456.jpg",
    path: "/uploads/test_123456.jpg",
    buffer: Buffer.alloc(1024 * 1024),
    stream: null as any,
    ...overrides,
  });

  const createMockFiles = (count: number): Express.Multer.File[] => {
    return Array.from({ length: count }, (_, i) =>
      createMockFile({
        originalname: `test${i}.jpg`,
        filename: `test${i}_123456.jpg`,
      }),
    );
  };

  beforeEach(() => {
    pipe = new ArrayFilesValidationPipe({});
  });

  describe("successful validation with defaults", () => {
    it("accepts valid array of files", () => {
      // Arrange
      const files = createMockFiles(2);

      // Act & Assert
      expect(() => pipe.transform(files)).not.toThrow();
    });

    it("accepts single file", () => {
      // Arrange
      const files = createMockFiles(1);

      // Act & Assert
      expect(() => pipe.transform(files)).not.toThrow();
    });

    it("accepts files at default maximum count", () => {
      // Arrange
      const files = createMockFiles(10); // Default max is 10

      // Act & Assert
      expect(() => pipe.transform(files)).not.toThrow();
    });

    it("accepts valid image MIME types", () => {
      // Arrange
      const files = [
        createMockFile({ mimetype: "image/jpeg", originalname: "test.jpg" }),
        createMockFile({ mimetype: "image/png", originalname: "test.png" }),
        createMockFile({ mimetype: "image/gif", originalname: "test.gif" }),
        createMockFile({ mimetype: "image/webp", originalname: "test.webp" }),
      ];

      // Act & Assert
      expect(() => pipe.transform(files)).not.toThrow();
    });
  });

  describe("file count validation", () => {
    it("throws error when no files provided", () => {
      // Arrange
      const files: Express.Multer.File[] = [];

      // Act & Assert
      expectBadRequest(
        () => pipe.transform(files),
        "At least one file is required",
      );
    });

    it("throws error when exceeding maximum count", () => {
      // Arrange
      const files = createMockFiles(11); // Default max is 10

      // Act & Assert
      expectBadRequest(() => pipe.transform(files), "Too many files");
      expectBadRequest(() => pipe.transform(files), "Maximum allowed: 10");
    });

    it("respects custom maxCount option", () => {
      // Arrange
      const customPipe = new ArrayFilesValidationPipe({ maxCount: 5 });
      const files = createMockFiles(6);

      // Act & Assert
      expectBadRequest(() => customPipe.transform(files), "Too many files");
      expectBadRequest(() => customPipe.transform(files), "Maximum allowed: 5");
    });

    it("throws error when files less than minCount", () => {
      // Arrange
      const customPipe = new ArrayFilesValidationPipe({ minCount: 3 });
      const files = createMockFiles(2);

      // Act & Assert
      expectBadRequest(() => customPipe.transform(files), "Too few files");
      expectBadRequest(
        () => customPipe.transform(files),
        "Minimum required: 3",
      );
    });
  });

  describe("file size validation", () => {
    it("throws error when file exceeds max size", () => {
      // Arrange
      const files = [
        createMockFile({
          size: 6 * 1024 * 1024, // 6MB, default max is 5MB
        }),
      ];

      // Act & Assert
      expectBadRequest(() => pipe.transform(files), "File size");
      expectBadRequest(() => pipe.transform(files), "exceeds maximum size");
    });

    it("throws error when file is too small", () => {
      // Arrange
      const files = [
        createMockFile({
          size: 512, // 512 bytes, default min is 1KB
        }),
      ];

      // Act & Assert
      expectBadRequest(() => pipe.transform(files), "File size");
      expectBadRequest(() => pipe.transform(files), "too small");
    });

    it("respects custom maxSize option", () => {
      // Arrange
      const customPipe = new ArrayFilesValidationPipe({
        maxSize: 2 * 1024 * 1024, // 2MB
      });
      const files = [
        createMockFile({
          size: 3 * 1024 * 1024, // 3MB
        }),
      ];

      // Act & Assert
      expectBadRequest(
        () => customPipe.transform(files),
        "exceeds maximum size",
      );
    });

    it("respects custom minSize option", () => {
      // Arrange
      const customPipe = new ArrayFilesValidationPipe({
        minSize: 2 * 1024 * 1024, // 2MB
      });
      const files = [
        createMockFile({
          size: 1 * 1024 * 1024, // 1MB
        }),
      ];

      // Act & Assert
      expectBadRequest(() => customPipe.transform(files), "too small");
    });
  });

  describe("MIME type validation", () => {
    it("throws error for unsupported MIME type", () => {
      // Arrange
      const files = [
        createMockFile({
          mimetype: "image/tiff",
        }),
      ];

      // Act & Assert
      expectBadRequest(() => pipe.transform(files), "Invalid file type");
    });

    it("throws error for non-image MIME type", () => {
      // Arrange
      const files = [
        createMockFile({
          mimetype: "application/pdf",
        }),
      ];

      // Act & Assert
      expectBadRequest(() => pipe.transform(files), "Invalid file type");
    });

    it("respects custom allowedMimeTypes option", () => {
      // Arrange
      const customPipe = new ArrayFilesValidationPipe({
        allowedMimeTypes: ["image/jpeg"],
      });
      const files = [
        createMockFile({
          mimetype: "image/png",
        }),
      ];

      // Act & Assert
      expectBadRequest(() => customPipe.transform(files), "Invalid file type");
    });

    it("includes file name in MIME type error", () => {
      // Arrange
      const files = [
        createMockFile({
          originalname: "document.pdf",
          mimetype: "application/pdf",
        }),
      ];

      // Act & Assert
      expectBadRequest(() => pipe.transform(files), "document.pdf");
    });
  });

  describe("file extension validation", () => {
    it("throws error for invalid extension", () => {
      // Arrange
      const files = [
        createMockFile({
          originalname: "document.txt",
        }),
      ];

      // Act & Assert
      expectBadRequest(() => pipe.transform(files), "Invalid file extension");
    });

    it("respects custom allowedExtensions option", () => {
      // Arrange
      const customPipe = new ArrayFilesValidationPipe({
        allowedExtensions: [".jpg"],
      });
      const files = [
        createMockFile({
          originalname: "test.png",
        }),
      ];

      // Act & Assert
      expectBadRequest(
        () => customPipe.transform(files),
        "Invalid file extension",
      );
    });

    it("handles uppercase extensions", () => {
      // Arrange
      const files = [
        createMockFile({
          originalname: "IMAGE.JPG",
        }),
      ];

      // Act & Assert
      expect(() => pipe.transform(files)).not.toThrow();
    });
  });

  describe("filename validation", () => {
    it("throws error when filename is empty", () => {
      // Arrange - Empty filename has no extension, fails extension check first
      const files = [
        createMockFile({
          originalname: "",
        }),
      ];

      // Act & Assert
      expectBadRequest(() => pipe.transform(files), "Invalid file extension");
    });

    it("throws error when filename is only spaces", () => {
      // Arrange - Spaces-only filename has no extension, fails extension check first
      const files = [
        createMockFile({
          originalname: "   ",
        }),
      ];

      // Act & Assert
      expectBadRequest(() => pipe.transform(files), "Invalid file extension");
    });

    it("throws error when filename exceeds 255 characters", () => {
      // Arrange
      const files = [
        createMockFile({
          originalname: "a".repeat(256) + ".jpg",
        }),
      ];

      // Act & Assert
      expectBadRequest(() => pipe.transform(files), "Filename is too long");
    });

    it("includes file index in error message", () => {
      // Arrange - Valid first file, oversized second file
      const files = [
        createMockFile({ originalname: "valid.jpg" }),
        createMockFile({ originalname: "toolong.jpg", size: 7 * 1024 * 1024 }),
      ];

      // Act & Assert
      expectBadRequest(() => pipe.transform(files), "File 2");
    });
  });

  describe("total size validation", () => {
    it("throws error when total size exceeds 50MB", () => {
      // Arrange - Use custom maxSize so individual files pass but total exceeds 50MB
      const customPipe = new ArrayFilesValidationPipe({
        maxSize: 35 * 1024 * 1024, // Allow up to 35MB per file
      });
      const files = [
        createMockFile({ size: 30 * 1024 * 1024 }),
        createMockFile({ size: 21 * 1024 * 1024 }),
      ];

      // Act & Assert
      expectBadRequest(
        () => customPipe.transform(files),
        "Total files size too large",
      );
      expectBadRequest(() => customPipe.transform(files), "50MB");
    });

    it("accepts multiple files within total size limit", () => {
      // Arrange
      const files = [
        createMockFile({ size: 5 * 1024 * 1024 }),
        createMockFile({ size: 5 * 1024 * 1024 }),
        createMockFile({ size: 5 * 1024 * 1024 }),
      ];

      // Act & Assert
      expect(() => pipe.transform(files)).not.toThrow();
    });
  });

  describe("error handling for multiple files", () => {
    it("identifies which file has size issue", () => {
      // Arrange
      const files = [
        createMockFile({ originalname: "valid1.jpg", size: 1024 * 1024 }),
        createMockFile({ originalname: "toobig.jpg", size: 10 * 1024 * 1024 }),
        createMockFile({ originalname: "valid2.jpg", size: 1024 * 1024 }),
      ];

      // Act & Assert
      expectBadRequest(() => pipe.transform(files), "toobig.jpg");
    });

    it("identifies which file has invalid MIME type", () => {
      // Arrange
      const files = [
        createMockFile({ originalname: "valid.jpg", mimetype: "image/jpeg" }),
        createMockFile({ originalname: "invalid.txt", mimetype: "text/plain" }),
      ];

      // Act & Assert
      expectBadRequest(() => pipe.transform(files), "invalid.txt");
    });

    it("validates all files in array", () => {
      // Arrange
      const files = createMockFiles(3);

      // Act & Assert
      expect(() => pipe.transform(files)).not.toThrow();
    });
  });

  describe("edge cases", () => {
    it("handles null files array gracefully", () => {
      // Arrange
      const files = null as any;

      // Act & Assert
      expectBadRequest(
        () => pipe.transform(files),
        "At least one file is required",
      );
    });

    it("handles undefined files array gracefully", () => {
      // Arrange
      const files = undefined as any;

      // Act & Assert
      expectBadRequest(
        () => pipe.transform(files),
        "At least one file is required",
      );
    });

    it("handles file with null originalname", () => {
      // Arrange
      const files = [
        createMockFile({
          originalname: null as any,
        }),
      ];

      // Act & Assert
      expect(() => pipe.transform(files)).toThrow();
    });

    it("returns files array when validation passes", () => {
      // Arrange
      const files = createMockFiles(2);

      // Act
      const result = pipe.transform(files);

      // Assert
      expect(result).toBe(files);
    });
  });
});
