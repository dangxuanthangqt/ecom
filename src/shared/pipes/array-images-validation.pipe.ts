import { Injectable, Logger, PipeTransform } from "@nestjs/common";

import throwHttpException from "../utils/throw-http-exception.util";

interface ArrayFilesValidationOptions {
  maxCount?: number;
  minCount?: number;
  maxSize?: number;
  minSize?: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
  required?: boolean;
}

@Injectable()
export class ArrayFilesValidationPipe implements PipeTransform {
  private readonly logger = new Logger(ArrayFilesValidationPipe.name);

  constructor(private readonly options: ArrayFilesValidationOptions = {}) {}

  transform(files: Express.Multer.File[]) {
    const {
      maxCount = 10,
      minCount = 1,
      maxSize = 5 * 1024 * 1024, // 5MB
      minSize = 1024, // 1KB
      allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"],
      allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"],
    } = this.options;

    // Check if files exist
    if (!files || files.length === 0) {
      this.logger.error(
        "At least one file is required but none were provided.",
      );
      throwHttpException({
        type: "badRequest",
        message: "At least one file is required",
      });
    }

    // Check file count
    if (files.length > maxCount) {
      this.logger.error(
        `Too many files. Maximum allowed: ${maxCount}. Got: ${files.length}`,
      );

      throwHttpException({
        type: "badRequest",
        message: `Too many files. Maximum allowed: ${maxCount}. Got: ${files.length}`,
      });
    }

    if (files.length < minCount) {
      this.logger.error(
        `Too few files. Minimum required: ${minCount}. Got: ${files.length}`,
      );
      throwHttpException({
        type: "badRequest",
        message: `Too few files. Minimum required: ${minCount}. Got: ${files.length}`,
      });
    }

    // Validate each file
    files.forEach((file, index) => {
      const filePrefix = `File ${index + 1}`;

      // Validate file size
      if (file.size > maxSize) {
        this.logger.error(
          `${filePrefix} (${file.originalname}): File size ${file.size} exceeds maximum size of ${maxSize} bytes.`,
        );
        throwHttpException({
          type: "badRequest",
          message: `${filePrefix} (${file.originalname}): File size ${file.size} exceeds maximum size of ${maxSize} bytes.`,
          field: filePrefix,
        });
      }

      if (file.size < minSize) {
        this.logger.error(
          `${filePrefix} (${file.originalname}): File size ${file.size} is too small. Minimum size: ${minSize} bytes.`,
        );
        throwHttpException({
          type: "badRequest",
          message: `${filePrefix} (${file.originalname}): File size ${file.size} is too small. Minimum size: ${minSize} bytes.`,
          field: filePrefix,
        });
      }

      // Validate MIME type
      if (!allowedMimeTypes.includes(file.mimetype)) {
        this.logger.error(
          `${filePrefix} (${file.originalname}): Invalid file type '${file.mimetype}'. Allowed: ${allowedMimeTypes.join(", ")}`,
        );

        throwHttpException({
          type: "badRequest",
          message: `${filePrefix} (${file.originalname}): Invalid file type '${file.mimetype}'. Allowed: ${allowedMimeTypes.join(", ")}`,
          field: filePrefix,
        });
      }

      // Validate file extension
      const fileExtension = file.originalname
        .toLowerCase()
        .match(/\.[^.]*$/)?.[0];
      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        this.logger.error(
          `${filePrefix} (${file.originalname}): Invalid file extension. Allowed: ${allowedExtensions.join(", ")}`,
        );
        throwHttpException({
          type: "badRequest",
          message: `${filePrefix} (${file.originalname}): Invalid file extension. Allowed: ${allowedExtensions.join(", ")}`,
          field: filePrefix,
        });
      }

      // Validate filename
      if (!file.originalname || file.originalname.trim() === "") {
        this.logger.error(`${filePrefix}: File must have a valid name`);
        throwHttpException({
          type: "badRequest",
          message: `${filePrefix}: File must have a valid name`,
          field: filePrefix,
        });
      }

      if (file.originalname.length > 255) {
        this.logger.error(
          `${filePrefix} (${file.originalname}): Filename is too long. Maximum length: 255 characters.`,
        );
        throwHttpException({
          type: "badRequest",
          message: `${filePrefix} (${file.originalname}): Filename is too long. Maximum length: 255 characters.`,
          field: filePrefix,
        });
      }

      // Check for duplicate filenames
      //   const duplicateIndex = files.findIndex(
      //     (f, i) => i !== index && f.originalname === file.originalname,
      //   );
      //   if (duplicateIndex !== -1) {
      //     this.logger.error(
      //       `${filePrefix} (${file.originalname}): Duplicate file name found.`,
      //     );
      //     throwHttpException({
      //       type: "badRequest",
      //       message: `${filePrefix} (${file.originalname}): Duplicate file name found.`,
      //       field: filePrefix,
      //     });
      //   }
    });

    // Check total size of all files
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const maxTotalSize = 50 * 1024 * 1024; // 50MB total
    if (totalSize > maxTotalSize) {
      this.logger.error(
        `Total files size too large. Maximum: ${maxTotalSize / (1024 * 1024)}MB. Got: ${(totalSize / (1024 * 1024)).toFixed(2)}MB`,
      );

      throwHttpException({
        type: "badRequest",
        message: `Total files size too large. Maximum: ${maxTotalSize / (1024 * 1024)}MB. Got: ${(totalSize / (1024 * 1024)).toFixed(2)}MB`,
        field: "totalSize",
      });
    }

    return files;
  }
}
