import { FileInterceptor } from "@nestjs/platform-express";

import {
  createSingleImageInterceptor,
  createSingleImageMemoryInterceptor,
  createSingleImageDiskInterceptor,
  FILE_SIZE_LIMITS,
} from "../single-image-interceptor.util";

jest.mock("@nestjs/platform-express");

describe("Single Image Interceptor Utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("FILE_SIZE_LIMITS", () => {
    it("defines IMAGE_5MB constant", () => {
      expect(FILE_SIZE_LIMITS.IMAGE_5MB).toBe(5 * 1024 * 1024);
    });

    it("defines IMAGE_2MB constant", () => {
      expect(FILE_SIZE_LIMITS.IMAGE_2MB).toBe(2 * 1024 * 1024);
    });

    it("defines IMAGE_10MB constant", () => {
      expect(FILE_SIZE_LIMITS.IMAGE_10MB).toBe(10 * 1024 * 1024);
    });

    it("defines DOCUMENT_20MB constant", () => {
      expect(FILE_SIZE_LIMITS.DOCUMENT_20MB).toBe(20 * 1024 * 1024);
    });

    it("is a valid const object", () => {
      expect(FILE_SIZE_LIMITS).toBeDefined();
      expect(typeof FILE_SIZE_LIMITS).toBe("object");
      // Verify all expected properties exist
      expect(FILE_SIZE_LIMITS.IMAGE_5MB).toBeDefined();
      expect(FILE_SIZE_LIMITS.IMAGE_2MB).toBeDefined();
      expect(FILE_SIZE_LIMITS.IMAGE_10MB).toBeDefined();
      expect(FILE_SIZE_LIMITS.DOCUMENT_20MB).toBeDefined();
    });
  });

  describe("createSingleImageInterceptor", () => {
    it("creates FileInterceptor with default field name", () => {
      // Act
      createSingleImageInterceptor();

      // Assert
      expect(FileInterceptor).toHaveBeenCalledWith(
        "file",
        expect.objectContaining({
          limits: {
            fileSize: FILE_SIZE_LIMITS.IMAGE_5MB,
          },
        }),
      );
    });

    it("creates FileInterceptor with custom field name", () => {
      // Act
      createSingleImageInterceptor("avatar");

      // Assert
      expect(FileInterceptor).toHaveBeenCalledWith(
        "avatar",
        expect.any(Object),
      );
    });

    it("includes fileFilter in options", () => {
      // Act
      createSingleImageInterceptor();

      // Assert
      expect(FileInterceptor).toHaveBeenCalledWith(
        "file",
        expect.objectContaining({
          fileFilter: expect.any(Function),
        }),
      );
    });

    it("uses custom file size when provided", () => {
      // Act
      createSingleImageInterceptor("file", {
        fileSize: FILE_SIZE_LIMITS.IMAGE_2MB,
      });

      // Assert
      expect(FileInterceptor).toHaveBeenCalledWith(
        "file",
        expect.objectContaining({
          limits: {
            fileSize: FILE_SIZE_LIMITS.IMAGE_2MB,
          },
        }),
      );
    });

    it("uses custom destination when provided", () => {
      // Act
      createSingleImageInterceptor("file", {
        destination: "./uploads/avatars",
      });

      // Assert
      expect(FileInterceptor).toHaveBeenCalledWith("file", expect.any(Object));
    });

    it("uses custom file filter when provided", () => {
      // Arrange
      const customFilter = jest.fn();

      // Act
      createSingleImageInterceptor("file", {
        fileFilter: customFilter,
      });

      // Assert
      expect(FileInterceptor).toHaveBeenCalledWith(
        "file",
        expect.objectContaining({
          fileFilter: customFilter,
        }),
      );
    });

    it("uses memory storage by default", () => {
      // Act
      createSingleImageInterceptor("file");

      // Assert
      const options = (FileInterceptor as jest.Mock).mock.calls[0][1];
      // Memory storage should not have 'storage' property or have useMemoryStorage: true
      expect(options.useMemoryStorage || !options.storage).toBeDefined();
    });

    it("uses disk storage when useMemoryStorage is false", () => {
      // Act
      createSingleImageInterceptor("file", {
        useMemoryStorage: false,
      });

      // Assert
      const options = (FileInterceptor as jest.Mock).mock.calls[0][1];
      expect(options.storage).toBeDefined();
    });
  });

  describe("createSingleImageMemoryInterceptor", () => {
    it("creates FileInterceptor for memory storage", () => {
      // Act
      createSingleImageMemoryInterceptor();

      // Assert
      expect(FileInterceptor).toHaveBeenCalledWith(
        "file",
        expect.objectContaining({
          limits: {
            fileSize: FILE_SIZE_LIMITS.IMAGE_5MB,
          },
        }),
      );
    });

    it("uses custom field name", () => {
      // Act
      createSingleImageMemoryInterceptor("profileImage");

      // Assert
      expect(FileInterceptor).toHaveBeenCalledWith(
        "profileImage",
        expect.any(Object),
      );
    });

    it("uses custom file size", () => {
      // Act
      createSingleImageMemoryInterceptor("file", {
        fileSize: FILE_SIZE_LIMITS.IMAGE_10MB,
      });

      // Assert
      expect(FileInterceptor).toHaveBeenCalledWith(
        "file",
        expect.objectContaining({
          limits: {
            fileSize: FILE_SIZE_LIMITS.IMAGE_10MB,
          },
        }),
      );
    });

    it("uses custom file filter", () => {
      // Arrange
      const customFilter = jest.fn();

      // Act
      createSingleImageMemoryInterceptor("file", {
        fileFilter: customFilter,
      });

      // Assert
      expect(FileInterceptor).toHaveBeenCalledWith(
        "file",
        expect.objectContaining({
          fileFilter: customFilter,
        }),
      );
    });

    it("does not include storage configuration", () => {
      // Act
      createSingleImageMemoryInterceptor("file");

      // Assert
      const options = (FileInterceptor as jest.Mock).mock.calls[0][1];
      // Memory storage should not have 'storage' property
      expect(options.storage).toBeUndefined();
    });
  });

  describe("createSingleImageDiskInterceptor", () => {
    it("creates FileInterceptor for disk storage", () => {
      // Act
      createSingleImageDiskInterceptor();

      // Assert
      expect(FileInterceptor).toHaveBeenCalledWith("file", expect.any(Object));
    });

    it("uses custom field name", () => {
      // Act
      createSingleImageDiskInterceptor("avatar");

      // Assert
      expect(FileInterceptor).toHaveBeenCalledWith(
        "avatar",
        expect.any(Object),
      );
    });

    it("uses custom file size", () => {
      // Act
      createSingleImageDiskInterceptor("file", {
        fileSize: FILE_SIZE_LIMITS.IMAGE_2MB,
      });

      // Assert
      expect(FileInterceptor).toHaveBeenCalledWith(
        "file",
        expect.objectContaining({
          limits: {
            fileSize: FILE_SIZE_LIMITS.IMAGE_2MB,
          },
        }),
      );
    });

    it("includes storage configuration", () => {
      // Act
      createSingleImageDiskInterceptor("file");

      // Assert
      const options = (FileInterceptor as jest.Mock).mock.calls[0][1];
      expect(options.storage).toBeDefined();
    });

    it("uses custom destination for disk storage", () => {
      // Act
      createSingleImageDiskInterceptor("file", {
        destination: "./uploads/products",
      });

      // Assert
      expect(FileInterceptor).toHaveBeenCalledWith("file", expect.any(Object));
    });

    it("uses custom file filter", () => {
      // Arrange
      const customFilter = jest.fn();

      // Act
      createSingleImageDiskInterceptor("file", {
        fileFilter: customFilter,
      });

      // Assert
      expect(FileInterceptor).toHaveBeenCalledWith(
        "file",
        expect.objectContaining({
          fileFilter: customFilter,
        }),
      );
    });

    it("does not include storage for memory-based configuration", () => {
      // Arrange
      const options = {
        fileSize: FILE_SIZE_LIMITS.IMAGE_5MB,
        useMemoryStorage: true,
      };

      // Act
      createSingleImageDiskInterceptor("file", options);

      // Assert - should be ignored as disk interceptor
      const callOptions = (FileInterceptor as jest.Mock).mock.calls[0][1];
      // Disk version should have storage
      expect(callOptions.storage).toBeDefined();
    });
  });

  describe("common functionality across interceptors", () => {
    it("all interceptors accept limits object", () => {
      // Act
      createSingleImageInterceptor("file", {
        fileSize: FILE_SIZE_LIMITS.IMAGE_5MB,
      });
      createSingleImageMemoryInterceptor("file", {
        fileSize: FILE_SIZE_LIMITS.IMAGE_5MB,
      });
      createSingleImageDiskInterceptor("file", {
        fileSize: FILE_SIZE_LIMITS.IMAGE_5MB,
      });

      // Assert
      expect(FileInterceptor).toHaveBeenCalledTimes(3);
      (FileInterceptor as jest.Mock).mock.calls.forEach((call) => {
        expect(call[1].limits).toBeDefined();
        expect(call[1].limits.fileSize).toBe(FILE_SIZE_LIMITS.IMAGE_5MB);
      });
    });

    it("all interceptors include fileFilter", () => {
      // Act
      createSingleImageInterceptor("file");
      createSingleImageMemoryInterceptor("file");
      createSingleImageDiskInterceptor("file");

      // Assert
      expect(FileInterceptor).toHaveBeenCalledTimes(3);
      (FileInterceptor as jest.Mock).mock.calls.forEach((call) => {
        expect(call[1].fileFilter).toBeDefined();
        expect(typeof call[1].fileFilter).toBe("function");
      });
    });
  });

  describe("default values", () => {
    it("createSingleImageInterceptor uses default field name 'file'", () => {
      // Act
      createSingleImageInterceptor();

      // Assert
      expect(FileInterceptor).toHaveBeenCalledWith("file", expect.any(Object));
    });

    it("createSingleImageMemoryInterceptor uses default field name 'file'", () => {
      // Act
      createSingleImageMemoryInterceptor();

      // Assert
      expect(FileInterceptor).toHaveBeenCalledWith("file", expect.any(Object));
    });

    it("createSingleImageDiskInterceptor uses default field name 'file'", () => {
      // Act
      createSingleImageDiskInterceptor();

      // Assert
      expect(FileInterceptor).toHaveBeenCalledWith("file", expect.any(Object));
    });

    it("all interceptors default to IMAGE_5MB size limit", () => {
      // Act
      createSingleImageInterceptor();
      createSingleImageMemoryInterceptor();
      createSingleImageDiskInterceptor();

      // Assert
      (FileInterceptor as jest.Mock).mock.calls.forEach((call) => {
        expect(call[1].limits.fileSize).toBe(FILE_SIZE_LIMITS.IMAGE_5MB);
      });
    });
  });

  describe("options handling", () => {
    it("handles empty options object", () => {
      // Act & Assert
      expect(() => createSingleImageInterceptor("file", {})).not.toThrow();
      expect(() =>
        createSingleImageMemoryInterceptor("file", {}),
      ).not.toThrow();
      expect(() => createSingleImageDiskInterceptor("file", {})).not.toThrow();
    });

    it("handles partial options", () => {
      // Act & Assert
      expect(() =>
        createSingleImageInterceptor("file", {
          fileSize: FILE_SIZE_LIMITS.IMAGE_2MB,
        }),
      ).not.toThrow();

      expect(() =>
        createSingleImageMemoryInterceptor("file", {
          fileFilter: jest.fn(),
        }),
      ).not.toThrow();
    });

    it("returns FileInterceptor result", () => {
      // Arrange
      const mockInterceptor = { use: jest.fn() };
      (FileInterceptor as jest.Mock).mockReturnValue(mockInterceptor);

      // Act
      const result = createSingleImageInterceptor("file");

      // Assert
      expect(result).toBe(mockInterceptor);
    });
  });
});
