import { PipeTransform, Injectable, BadRequestException } from "@nestjs/common";

@Injectable()
export class ImageValidationPipe implements PipeTransform {
  private readonly allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ];

  private readonly maxSize = 5 * 1024 * 1024; // 5MB
  private readonly minSize = 1024; // 1KB

  transform(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("File is required.");
    }

    // Validate file size
    if (file.size > this.maxSize) {
      throw new BadRequestException(
        `File too large. Maximum size: ${this.maxSize / (1024 * 1024)}MB`,
      );
    }

    if (file.size < this.minSize) {
      throw new BadRequestException(
        `File too small. Minimum size: ${this.minSize / 1024}KB`,
      );
    }

    // Validate mime type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.allowedMimeTypes.join(", ")}`,
      );
    }

    // Validate file name
    if (!file.originalname) {
      throw new BadRequestException("File must have a name");
    }

    // Validate file extension
    const allowedExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp",
      ".svg",
    ];
    const fileExtension = file.originalname
      .toLowerCase()
      .match(/\.[^.]*$/)?.[0];

    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      throw new BadRequestException(
        `Invalid file extension. Allowed: ${allowedExtensions.join(", ")}`,
      );
    }

    // // Additional security check - validate magic numbers (file signatures)
    // if (this.isImageFile(file.buffer, file.mimetype)) {
    //   return file;
    // } else {
    //   throw new BadRequestException(
    //     "File content does not match its extension",
    //   );
    // }
  }

  // private isImageFile(buffer: Buffer, mimeType: string): boolean {
  //   if (!buffer || buffer.length < 4) return false;

  //   const signatures = {
  //     "image/jpeg": [0xff, 0xd8, 0xff],
  //     "image/png": [0x89, 0x50, 0x4e, 0x47],
  //     "image/gif": [0x47, 0x49, 0x46],
  //     "image/webp": [0x52, 0x49, 0x46, 0x46], // RIFF
  //   };

  //   const signature = signatures[mimeType];
  //   if (!signature) return true; // Skip validation for unsupported types

  //   return signature.every((byte, index) => buffer[index] === byte);
  // }
}
