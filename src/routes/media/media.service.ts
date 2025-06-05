import { Injectable } from "@nestjs/common";

import { S3Service } from "@/shared/services/s3.service";

@Injectable()
export class MediaService {
  constructor(private readonly s3Service: S3Service) {}

  async uploadImageFromDisk(
    file: Express.Multer.File,
  ): Promise<{ url: string }> {
    const { path, originalname, mimetype } = file;

    const result = await this.s3Service.uploadSimpleFileFromDisk({
      filePath: path,
      fileName: originalname,
      mimeType: mimetype,
    });

    return result;
  }

  async uploadLargeImageFromDisk(
    file: Express.Multer.File,
  ): Promise<{ url: string }> {
    const { path, originalname, mimetype } = file;

    const result = await this.s3Service.uploadLargeFileFromDisk({
      filePath: path,
      fileName: originalname,
      mimeType: mimetype,
    });

    return result;
  }

  async uploadImageFromBuffer(
    file: Express.Multer.File,
  ): Promise<{ url: string }> {
    const { buffer, originalname, mimetype } = file;

    const result = await this.s3Service.uploadFileFromBuffer({
      buffer,
      fileName: originalname,
      mimeType: mimetype,
    });

    return result;
  }

  async uploadArrayOfImagesFromBuffer(
    files: Express.Multer.File[],
  ): Promise<{ urls: string[] }> {
    const uploadPromises = files.map(async (file) => {
      const { buffer, originalname, mimetype } = file;

      const result = await this.s3Service.uploadFileFromBuffer({
        buffer,
        fileName: originalname,
        mimeType: mimetype,
      });

      return result.url;
    });

    const urls = await Promise.all(uploadPromises);

    return { urls };
  }

  async uploadMultipleImagesFromBuffer(files: {
    file1?: Express.Multer.File[];
    file2?: Express.Multer.File[];
  }): Promise<{ urls: string[] }> {
    const uploadPromises = Object.values(files)
      .flat()
      .map(async (file) => {
        const { buffer, originalname, mimetype } = file;

        const result = await this.s3Service.uploadFileFromBuffer({
          buffer,
          fileName: originalname,
          mimeType: mimetype,
        });

        return result.url;
      });

    const urls = await Promise.all(uploadPromises);

    return { urls };
  }

  async uploadLargeFileFromBuffer(
    file: Express.Multer.File,
  ): Promise<{ url: string }> {
    const { buffer, originalname, mimetype } = file;

    const result = await this.s3Service.uploadLargeFileFromBuffer({
      buffer,
      fileName: originalname,
      mimeType: mimetype,
    });

    return result;
  }

  async getPresignedUrl(key: string): Promise<{ downloadUrl: string }> {
    const result = await this.s3Service.generateSecureDownloadUrl({
      key,
    });

    return result;
  }

  async deleteMedia(key: string): Promise<{ message: string }> {
    const result = await this.s3Service.deleteFile({ key });

    return result;
  }
}
