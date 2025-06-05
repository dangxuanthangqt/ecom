import { existsSync, mkdirSync } from "fs";
import path from "path";

import { BadRequestException } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { MulterOptions } from "@nestjs/platform-express/multer/interfaces/multer-options.interface";
import { diskStorage } from "multer";

import { UPLOAD_DESTINATIONS } from "@/constants/upload.constant";

export const FILE_SIZE_LIMITS = {
  IMAGE_5MB: 5 * 1024 * 1024,
  IMAGE_2MB: 2 * 1024 * 1024,
  IMAGE_10MB: 10 * 1024 * 1024,
  DOCUMENT_20MB: 20 * 1024 * 1024,
} as const;

const fileFilter: MulterOptions["fileFilter"] = (req, file, callback) => {
  // Validate file type
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return callback(
      new BadRequestException(
        `Invalid file type. Allowed types: ${allowedMimeTypes.join(", ")}`,
      ),
      false,
    );
  }

  // Validate file extension
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
    return callback(
      new BadRequestException(
        `Invalid file extension. Allowed extensions: ${allowedExtensions.join(", ")}`,
      ),
      false,
    );
  }

  callback(null, true);
};

// Create disk storage configuration
const createDiskStorage = (destination: string = UPLOAD_DESTINATIONS.TEMP) => {
  return diskStorage({
    destination: (req, file, cb) => {
      // Ensure destination directory exists
      if (!existsSync(destination)) {
        mkdirSync(destination, { recursive: true });
      }
      cb(null, destination);
    },
    filename: (req, file, cb) => {
      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const uniqueFilename = `${file.originalname}_${Date.now()}${fileExtension}`;

      cb(null, uniqueFilename);
    },
  });
};

const createMulterOptions = (options: {
  fileSize?: number;
  fileFilter?: MulterOptions["fileFilter"];
  destination?: string;
  useMemoryStorage?: boolean;
}): MulterOptions => {
  const {
    fileSize = FILE_SIZE_LIMITS.IMAGE_5MB,
    fileFilter: customFileFilter = fileFilter,
    destination = UPLOAD_DESTINATIONS.TEMP,
    useMemoryStorage = false,
  } = options;

  const baseOptions: MulterOptions = {
    limits: {
      fileSize,
    },
    fileFilter: customFileFilter,
  };

  // Choose storage type
  if (useMemoryStorage) {
    // Use memory storage (default Multer behavior)
    return baseOptions;
  } else {
    // Use disk storage
    return {
      ...baseOptions,
      storage: createDiskStorage(destination),
    };
  }
};

// Factory functions for interceptors
export const createSingleImageInterceptor = (
  fieldName: string = "file",
  options?: {
    fileSize?: number;
    fileFilter?: MulterOptions["fileFilter"];
    destination?: string;
    useMemoryStorage?: boolean;
  },
) => {
  return FileInterceptor(fieldName, createMulterOptions(options || {}));
};

// Convenience functions for different storage types
export const createSingleImageMemoryInterceptor = (
  fieldName: string = "file",
  options?: {
    fileSize?: number;
    fileFilter?: MulterOptions["fileFilter"];
  },
) => {
  return FileInterceptor(
    fieldName,
    createMulterOptions({
      ...options,
      useMemoryStorage: true,
    }),
  );
};

export const createSingleImageDiskInterceptor = (
  fieldName: string = "file",
  options?: {
    fileSize?: number;
    fileFilter?: MulterOptions["fileFilter"];
    destination?: string;
  },
) => {
  return FileInterceptor(
    fieldName,
    createMulterOptions({
      ...options,
      useMemoryStorage: false,
    }),
  );
};
