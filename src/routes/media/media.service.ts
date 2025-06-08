import { Injectable } from "@nestjs/common";

import { PRESIGNED_URL_TYPE } from "@/constants/upload.constant";
import {
  DeleteFileQueryDto,
  PresignedUrlQueryDto,
  PresignedUrlResponseDto,
} from "@/dtos/media/media.dto";
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

  async getPresignedUrl({
    key,
    type,
  }: PresignedUrlQueryDto): Promise<PresignedUrlResponseDto> {
    if (type === PRESIGNED_URL_TYPE.UPLOAD) {
      const { uploadUrl } = await this.s3Service.generatePresignedUploadUrl({
        key,
      });

      return {
        url: uploadUrl,
      };
    }

    const { downloadUrl } = await this.s3Service.generatePresignedDownloadUrl({
      key,
    });

    return {
      url: downloadUrl,
    };
  }

  async deleteMedia({ key }: DeleteFileQueryDto): Promise<{ message: string }> {
    const result = await this.s3Service.deleteFile({ key });

    return result;
  }
}
