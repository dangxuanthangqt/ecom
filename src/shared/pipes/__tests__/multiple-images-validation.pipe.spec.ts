import { Readable } from "stream";

import { BadRequestException } from "@nestjs/common";

import { MultipleFilesValidationPipe } from "../multiple-images-validation.pipe";

/**
 * A deliberately ill-typed value, for the tests that exercise the pipe's
 * runtime guards against input TypeScript would never allow.
 */
const invalid = <T = never>(value: unknown): T => value as T;

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
        message = response.message
          .map((m) => (m as { message?: string }).message ?? String(m))
          .join(" ");
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

describe("MultipleFilesValidationPipe", () => {
  let pipe: MultipleFilesValidationPipe;

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
    stream: null as unknown as Readable,
    ...overrides,
  });

  beforeEach(() => {
    pipe = new MultipleFilesValidationPipe({
      avatar: {
        maxCount: 1,
        maxSize: 5 * 1024 * 1024,
        allowedMimeTypes: ["image/jpeg", "image/png"],
        allowedExtensions: [".jpg", ".jpeg", ".png"],
      },
      gallery: {
        maxCount: 5,
        maxSize: 5 * 1024 * 1024,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
        allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
      },
    });
  });

  describe("successful validation", () => {
    it("accepts valid files for single field", () => {
      // Arrange
      const files = {
        avatar: [
          createMockFile({ fieldname: "avatar", originalname: "avatar.jpg" }),
        ],
      };

      // Act & Assert
      expect(() => pipe.transform(files)).not.toThrow();
    });

    it("accepts valid files for multiple fields", () => {
      // Arrange
      const files = {
        avatar: [
          createMockFile({ fieldname: "avatar", originalname: "avatar.jpg" }),
        ],
        gallery: [
          createMockFile({ fieldname: "gallery", originalname: "image1.jpg" }),
          createMockFile({ fieldname: "gallery", originalname: "image2.png" }),
        ],
      };

      // Act & Assert
      expect(() => pipe.transform(files)).not.toThrow();
    });

    it("accepts optional field when not provided", () => {
      // Arrange
      const files = {
        avatar: [createMockFile({ fieldname: "avatar" })],
      };

      // Act & Assert
      expect(() => pipe.transform(files)).not.toThrow();
    });

    it("accepts maximum allowed files per field", () => {
      // Arrange
      const files = {
        gallery: Array.from({ length: 5 }, (_, i) =>
          createMockFile({
            fieldname: "gallery",
            originalname: `image${i}.jpg`,
          }),
        ),
      };

      // Act & Assert
      expect(() => pipe.transform(files)).not.toThrow();
    });

    it("returns files object on successful validation", () => {
      // Arrange
      const files = {
        avatar: [createMockFile({ fieldname: "avatar" })],
      };

      // Act
      const result = pipe.transform(files);

      // Assert
      expect(result).toEqual(files);
    });
  });

  describe("required field validation", () => {
    it("throws error when required field is missing", () => {
      // Arrange
      const pipeWithRequired = new MultipleFilesValidationPipe({
        avatar: {
          maxCount: 1,
          required: true,
        },
        gallery: {
          maxCount: 5,
          required: false,
        },
      });

      const files = {
        gallery: [createMockFile({ fieldname: "gallery" })],
      };

      // Act & Assert
      expectBadRequest(
        () => pipeWithRequired.transform(files),
        "Field 'avatar' is required",
      );
    });

    it("accepts optional field when not provided", () => {
      // Arrange
      const pipeWithOptional = new MultipleFilesValidationPipe({
        avatar: {
          maxCount: 1,
          required: false,
        },
      });

      const files = {};

      // Act & Assert
      expect(() => pipeWithOptional.transform(files)).not.toThrow();
    });

    it("throws error when required field is empty array", () => {
      // Arrange
      const pipeWithRequired = new MultipleFilesValidationPipe({
        avatar: {
          maxCount: 1,
          required: true,
        },
      });

      const files = {
        avatar: [],
      };

      // Act & Assert
      expectBadRequest(
        () => pipeWithRequired.transform(files),
        "Field 'avatar' is required",
      );
    });
  });

  describe("max count validation", () => {
    it("throws error when field exceeds max count", () => {
      // Arrange
      const files = {
        avatar: [
          createMockFile({ fieldname: "avatar", originalname: "avatar1.jpg" }),
          createMockFile({ fieldname: "avatar", originalname: "avatar2.jpg" }),
        ],
      };

      // Act & Assert
      expectBadRequest(() => pipe.transform(files), "exceeds maximum count");
      expectBadRequest(() => pipe.transform(files), "avatar");
      expectBadRequest(() => pipe.transform(files), "1");
    });

    it("allows different max counts for different fields", () => {
      // Arrange
      const files = {
        avatar: [createMockFile({ fieldname: "avatar" })], // max 1
        gallery: Array.from({ length: 5 }, (_, i) =>
          createMockFile({
            fieldname: "gallery",
            originalname: `image${i}.jpg`,
          }),
        ), // max 5
      };

      // Act & Assert
      expect(() => pipe.transform(files)).not.toThrow();
    });

    it("throws error with correct field name in message", () => {
      // Arrange
      const files = {
        avatar: Array.from({ length: 2 }, () =>
          createMockFile({ fieldname: "avatar" }),
        ),
      };

      // Act & Assert
      expectBadRequest(() => pipe.transform(files), "avatar");
    });
  });

  describe("file size validation", () => {
    it("throws error when file exceeds maxSize for field", () => {
      // Arrange
      const files = {
        avatar: [
          createMockFile({
            fieldname: "avatar",
            size: 6 * 1024 * 1024, // Exceeds 5MB limit
          }),
        ],
      };

      // Act & Assert
      expectBadRequest(() => pipe.transform(files), "File size");
      expectBadRequest(() => pipe.transform(files), "exceeds maximum size");
    });

    it("respects different maxSize for different fields", () => {
      // Arrange
      const customPipe = new MultipleFilesValidationPipe({
        avatar: { maxCount: 1, maxSize: 2 * 1024 * 1024 },
        gallery: { maxCount: 5, maxSize: 10 * 1024 * 1024 },
      });

      const files = {
        gallery: [
          createMockFile({
            fieldname: "gallery",
            size: 9 * 1024 * 1024,
          }),
        ],
      };

      // Act & Assert
      expect(() => customPipe.transform(files)).not.toThrow();
    });

    it("throws error for oversized file in field", () => {
      // Arrange
      const files = {
        avatar: [
          createMockFile({
            fieldname: "avatar",
            originalname: "large.jpg",
            size: 10 * 1024 * 1024,
          }),
        ],
      };

      // Act & Assert
      expect(() => pipe.transform(files)).toThrow();
    });
  });

  describe("MIME type validation", () => {
    it("throws error for invalid MIME type in field", () => {
      // Arrange
      const files = {
        avatar: [
          createMockFile({
            fieldname: "avatar",
            mimetype: "image/webp", // Not allowed for avatar
          }),
        ],
      };

      // Act & Assert
      expectBadRequest(() => pipe.transform(files), "Invalid file type");
    });

    it("respects different MIME types for different fields", () => {
      // Arrange
      const files = {
        avatar: [
          createMockFile({
            fieldname: "avatar",
            mimetype: "image/jpeg",
          }),
        ],
        gallery: [
          createMockFile({
            fieldname: "gallery",
            mimetype: "image/webp", // Allowed for gallery
          }),
        ],
      };

      // Act & Assert
      expect(() => pipe.transform(files)).not.toThrow();
    });

    it("throws error for invalid MIME type in field", () => {
      // Arrange
      const files = {
        gallery: [
          createMockFile({
            fieldname: "gallery",
            mimetype: "video/mp4",
            originalname: "video.mp4",
          }),
        ],
      };

      // Act & Assert
      expect(() => pipe.transform(files)).toThrow();
    });
  });

  describe("file extension validation", () => {
    it("throws error for invalid extension in field", () => {
      // Arrange
      const files = {
        avatar: [
          createMockFile({
            fieldname: "avatar",
            originalname: "avatar.webp", // Not allowed for avatar
          }),
        ],
      };

      // Act & Assert
      expectBadRequest(() => pipe.transform(files), "Invalid file extension");
    });

    it("respects different extensions for different fields", () => {
      // Arrange
      const files = {
        avatar: [
          createMockFile({
            fieldname: "avatar",
            originalname: "avatar.jpg",
          }),
        ],
        gallery: [
          createMockFile({
            fieldname: "gallery",
            originalname: "image.webp", // Allowed for gallery
          }),
        ],
      };

      // Act & Assert
      expect(() => pipe.transform(files)).not.toThrow();
    });

    it("validates extension match in file list", () => {
      // Arrange
      const files = {
        gallery: [
          createMockFile({
            fieldname: "gallery",
            originalname: "image1.jpg",
          }),
          createMockFile({
            fieldname: "gallery",
            originalname: "image2.txt", // Invalid
          }),
        ],
      };

      // Act & Assert
      expectBadRequest(() => pipe.transform(files), "Invalid file extension");
      expectBadRequest(() => pipe.transform(files), "gallery[1]");
    });
  });

  describe("filename validation", () => {
    it("throws error when filename is empty", () => {
      // Arrange - Use config without allowedExtensions so filename check runs
      const pipeNoExtCheck = new MultipleFilesValidationPipe({
        avatar: {
          maxCount: 1,
          // No allowedExtensions, so filename check will run
        },
      });

      const files = {
        avatar: [
          createMockFile({
            fieldname: "avatar",
            originalname: "",
          }),
        ],
      };

      // Act & Assert
      expectBadRequest(
        () => pipeNoExtCheck.transform(files),
        "File must have a name",
      );
    });

    it("throws error when filename is whitespace only", () => {
      // Arrange - Use config without allowedExtensions so filename check runs
      const pipeNoExtCheck = new MultipleFilesValidationPipe({
        avatar: {
          maxCount: 1,
          // No allowedExtensions, so filename check will run
        },
      });

      const files = {
        avatar: [
          createMockFile({
            fieldname: "avatar",
            originalname: "   ",
          }),
        ],
      };

      // Act & Assert
      expectBadRequest(
        () => pipeNoExtCheck.transform(files),
        "File must have a name",
      );
    });

    it("throws error when second file in field has no name", () => {
      // Arrange
      const files = {
        gallery: [
          createMockFile({ fieldname: "gallery", originalname: "valid.jpg" }),
          createMockFile({ fieldname: "gallery", originalname: "" }),
        ],
      };

      // Act & Assert
      expect(() => pipe.transform(files)).toThrow();
    });
  });

  describe("unexpected fields validation", () => {
    it("throws error when unexpected field is provided", () => {
      // Arrange
      const files = {
        avatar: [createMockFile({ fieldname: "avatar" })],
        unexpected: [createMockFile({ fieldname: "unexpected" })],
      };

      // Act & Assert
      expect(() => pipe.transform(files)).toThrow();
    });

    it("rejects fields not in configuration", () => {
      // Arrange
      const files = {
        avatar: [createMockFile({ fieldname: "avatar" })],
        badField: [createMockFile({ fieldname: "badField" })],
      };

      // Act & Assert
      expect(() => pipe.transform(files)).toThrow();
    });

    it("accepts only configured fields", () => {
      // Arrange
      const files = {
        avatar: [createMockFile({ fieldname: "avatar" })],
      };

      // Act & Assert
      expect(() => pipe.transform(files)).not.toThrow();
    });
  });

  describe("edge cases", () => {
    it("treats null field as empty and validates based on config", () => {
      // Arrange
      const pipeWithRequired = new MultipleFilesValidationPipe({
        avatar: {
          maxCount: 1,
          required: true,
        },
      });
      const files = {
        avatar: invalid(null),
      };

      // Act & Assert
      expect(() => pipeWithRequired.transform(files)).toThrow();
    });

    it("handles undefined field files array", () => {
      // Arrange
      const files = {
        avatar: invalid(undefined),
      };

      // Act & Assert
      // Should treat as missing/empty
      expect(() => pipe.transform(files)).not.toThrow();
    });

    it("handles empty configuration", () => {
      // Arrange
      const emptyPipe = new MultipleFilesValidationPipe({});
      const files = {};

      // Act & Assert
      expect(() => emptyPipe.transform(files)).not.toThrow();
    });

    it("handles optional MIME types and extensions", () => {
      // Arrange
      const lenientPipe = new MultipleFilesValidationPipe({
        document: {
          maxCount: 1,
          // No allowedMimeTypes or allowedExtensions specified
        },
      });

      const files = {
        document: [createMockFile({ fieldname: "document" })],
      };

      // Act & Assert
      expect(() => lenientPipe.transform(files)).not.toThrow();
    });

    it("validates multiple files in single field correctly", () => {
      // Arrange
      const files = {
        gallery: [
          createMockFile({
            fieldname: "gallery",
            originalname: "img1.jpg",
          }),
          createMockFile({
            fieldname: "gallery",
            originalname: "img2.jpg",
          }),
          createMockFile({
            fieldname: "gallery",
            originalname: "img3.webp",
          }),
        ],
      };

      // Act & Assert
      expect(() => pipe.transform(files)).not.toThrow();
    });
  });
});
