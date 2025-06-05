import { Injectable, Logger, PipeTransform } from "@nestjs/common";

import throwHttpException from "../utils/throw-http-exception.util";

interface FileFieldsConfig {
  [fieldName: string]: {
    maxCount: number;
    maxSize?: number;
    allowedMimeTypes?: string[];
    allowedExtensions?: string[];
    required?: boolean;
  };
}

@Injectable()
export class MultipleFilesValidationPipe implements PipeTransform {
  private readonly logger = new Logger(MultipleFilesValidationPipe.name);

  constructor(private readonly config: FileFieldsConfig) {}

  transform(files: { [fieldname: string]: Express.Multer.File[] }) {
    // Validate each field
    Object.entries(this.config).forEach(([fieldName, fieldConfig]) => {
      const fieldFiles = files[fieldName] || [];

      // Check if required field is missing
      if (fieldConfig.required && fieldFiles.length === 0) {
        this.logger.error(`Field '${fieldName}' is required but not provided.`);

        throwHttpException({
          type: "badRequest",
          message: `Field '${fieldName}' is required`,
          field: fieldName,
        });
      }

      // Check max count
      if (fieldFiles.length > fieldConfig.maxCount) {
        this.logger.error(
          `Field '${fieldName}' exceeds maximum count of ${fieldConfig.maxCount}. Got ${fieldFiles.length} files.`,
        );

        throwHttpException({
          type: "badRequest",
          message: `Field '${fieldName}' exceeds maximum count of ${fieldConfig.maxCount}. Got ${fieldFiles.length} files.`,
          field: fieldName,
        });
      }

      // Validate each file in the field
      fieldFiles.forEach((file, index) => {
        const filePrefix = `${fieldName}[${index}]`;

        // Validate file size
        if (fieldConfig.maxSize && file.size > fieldConfig.maxSize) {
          this.logger.error(
            `${filePrefix}: File size ${file.size} exceeds maximum size of ${fieldConfig.maxSize} bytes.`,
          );
          throwHttpException({
            type: "badRequest",
            message: `${filePrefix}: File size ${file.size} exceeds maximum size of ${fieldConfig.maxSize} bytes.`,
            field: filePrefix,
          });
        }

        // Validate mime type
        if (
          fieldConfig.allowedMimeTypes &&
          !fieldConfig.allowedMimeTypes.includes(file.mimetype)
        ) {
          this.logger.error(
            `${filePrefix}: Invalid file type '${file.mimetype}'. Allowed: ${fieldConfig.allowedMimeTypes.join(", ")}`,
          );

          throwHttpException({
            type: "badRequest",
            message: `${filePrefix}: Invalid file type '${file.mimetype}'. Allowed: ${fieldConfig.allowedMimeTypes.join(", ")}`,
            field: filePrefix,
          });
        }

        // Validate file extension
        if (fieldConfig.allowedExtensions) {
          const fileExtension = file.originalname
            .toLowerCase()
            .match(/\.[^.]*$/)?.[0];

          if (
            !fileExtension ||
            !fieldConfig.allowedExtensions.includes(fileExtension)
          ) {
            this.logger.error(
              `${filePrefix}: Invalid file extension. Allowed: ${fieldConfig.allowedExtensions.join(", ")}`,
            );

            throwHttpException({
              type: "badRequest",
              message: `${filePrefix}: Invalid file extension. Allowed: ${fieldConfig.allowedExtensions.join(", ")}`,
              field: filePrefix,
            });
          }
        }

        // Validate file name
        if (!file.originalname || file.originalname.trim() === "") {
          this.logger.error(`${filePrefix}: File must have a name`);

          throwHttpException({
            type: "badRequest",
            message: `${filePrefix}: File must have a name`,
            field: filePrefix,
          });
        }
      });
    });

    // Check for unexpected fields
    Object.keys(files).forEach((fieldName) => {
      if (!this.config[fieldName]) {
        this.logger.error(
          `Unexpected field: '${fieldName}'. Allowed fields: ${Object.keys(this.config).join(", ")}`,
        );

        throwHttpException({
          type: "badRequest",
          message: `Unexpected field: '${fieldName}'. Allowed fields: ${Object.keys(this.config).join(", ")}`,
          field: fieldName,
        });
      }
    });

    return files;
  }
}
