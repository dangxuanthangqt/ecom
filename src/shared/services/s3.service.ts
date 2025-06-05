/* eslint-disable @typescript-eslint/no-floating-promises */
import { createReadStream, promises as fs, statSync } from "fs";
import * as path from "path";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable, Logger } from "@nestjs/common";

import throwHttpException from "../utils/throw-http-exception.util";

import { AppConfigService } from "./app-config.service";

import { UPLOAD_S3_DESTINATIONS } from "@/constants/upload.constant";

@Injectable()
export class S3Service {
  public s3: S3;

  private readonly logger = new Logger(S3Service.name);

  constructor(private readonly appConfigService: AppConfigService) {
    const appConfig = this.appConfigService.appConfig;

    this.s3 = new S3({
      region: appConfig.s3Region,
      credentials: {
        accessKeyId: appConfig.s3AccessKey,
        secretAccessKey: appConfig.s3SecretKey,
      },
    });

    this.s3.listBuckets({}).then((data) => {
      if (data.Buckets) {
        this.logger.log(
          `S3 Buckets: ${data.Buckets.map((bucket) => bucket.Name).join(", ")}`,
        );
      } else {
        this.logger.warn("No S3 buckets found.");
      }
    });
  }

  private getPublicUrl(key: string): string {
    const appConfig = this.appConfigService.appConfig;

    // Note: Ensure your S3 bucket is configured to allow public access to the files
    // Bucket policy should allow public read access to the objects.
    // Example bucket policy:
    // {
    //   "Version": "2012-10-17",
    //   "Statement": [
    //     {
    //       "Sid": "PublicReadGetObject",
    //       "Effect": "Allow",
    //       "Principal": "*",
    //       "Action": "s3:GetObject",
    //       "Resource": "arn:aws:s3:::your-bucket"
    //     }
    //   ]
    // }
    return `https://${appConfig.s3BucketName}.s3.${appConfig.s3Region}.amazonaws.com/${key}`;
  }

  /**
   * Upload file from disk with progress tracking
   */
  async uploadLargeFileFromDisk({
    filePath,
    fileName,
    mimeType,
    folder = UPLOAD_S3_DESTINATIONS.IMAGES,
    cleanup = true,
    progressCallback,
  }: {
    filePath: string;
    fileName: string;
    mimeType: string;
    folder?: string;
    cleanup?: boolean;
    progressCallback?: (progress: {
      loaded: number;
      total: number;
      percentage: number;
    }) => void;
  }): Promise<{
    url: string;
  }> {
    // Validate file first
    await this.validateFileBeforeUpload(filePath);

    try {
      const fileStats = statSync(filePath);
      const fileSize = fileStats.size;

      const appConfig = this.appConfigService.appConfig;
      const fileExtension = path.extname(fileName);
      const uniqueFileName = `${fileName.replace(fileExtension, "")}_${Date.now()}${fileExtension}`;
      const key = `${folder}/${uniqueFileName}`;

      const fileStream = createReadStream(filePath);

      // // Track upload progress
      // let uploadedBytes = 0;

      // if (progressCallback) {
      //   fileStream.on("data", (chunk) => {
      //     uploadedBytes += chunk.length;
      //     const percentage = Math.round((uploadedBytes / fileSize) * 100);
      //     progressCallback({
      //       loaded: uploadedBytes,
      //       total: fileSize,
      //       percentage,
      //     });
      //   });
      // }

      const upload = new Upload({
        client: this.s3,
        params: {
          Bucket: appConfig.s3BucketName,
          Key: key,
          Body: fileStream,
          ContentType: mimeType,
          Metadata: {
            originalName: fileName,
            uploadedAt: new Date().toISOString(),
          },
          ServerSideEncryption: "AES256",
        },
        partSize: 1024 * 1024 * 5, // 5MB
        queueSize: 4,
      });

      // Additional progress tracking for multipart uploads
      if (progressCallback) {
        upload.on("httpUploadProgress", (progress) => {
          const percentage = progress.total
            ? Math.round((progress.loaded! / progress.total) * 100)
            : 0;

          progressCallback({
            loaded: progress.loaded || 0,
            total: progress.total || fileSize,
            percentage,
          });
        });
      }

      await upload.done();
      const url = this.getPublicUrl(key);

      this.logger.log(
        `File uploaded with progress tracking: ${filePath} -> ${key}`,
      );

      if (cleanup) {
        await this.cleanupTempFile(filePath);
      }

      return {
        url,
      };
    } catch (error) {
      this.logger.error(
        `Failed to upload file with progress: ${filePath} : ${JSON.stringify(error)}`,
      );

      if (cleanup) {
        await this.cleanupTempFile(filePath);
      }

      throwHttpException({
        type: "internal",
        message: "Failed to upload file to S3.",
      });
    }
  }

  /**
   * Upload small file using stream (< 100MB)
   */
  async uploadSimpleFileFromDisk({
    filePath,
    fileName,
    mimeType,
    folder = UPLOAD_S3_DESTINATIONS.IMAGES,
    cleanup = true,
  }: {
    filePath: string;
    mimeType: string;
    fileName: string;
    folder?: string;
    cleanup?: boolean;
  }): Promise<{
    url: string;
  }> {
    // Validate file first
    await this.validateFileBeforeUpload(filePath);

    try {
      const appConfig = this.appConfigService.appConfig;
      const fileStream = createReadStream(filePath);

      const fileExtension = path.extname(fileName);
      const uniqueFileName = `${fileName.replace(fileExtension, "")}_${Date.now()}${fileExtension}`;
      const key = `${folder}/${uniqueFileName}`;

      const command = new PutObjectCommand({
        Bucket: appConfig.s3BucketName,
        Key: key,
        Body: fileStream,
        ContentType: mimeType,
        Metadata: {
          originalName: fileName,
          uploadedAt: new Date().toISOString(),
        },
        ServerSideEncryption: "AES256",
      });

      await this.s3.send(command);

      const url = this.getPublicUrl(key);
      this.logger.log(`File uploaded successfully: ${filePath} -> ${key}`);

      if (cleanup) {
        await this.cleanupTempFile(filePath);
      }

      return {
        url,
      };
    } catch (error) {
      this.logger.error(
        `Failed to upload file: ${filePath} : ${JSON.stringify(error)}`,
      );

      if (cleanup) {
        await this.cleanupTempFile(filePath);
      }

      throwHttpException({
        type: "internal",
        message: "Failed to upload file to S3.",
      });
    }
  }

  /**
   * Cleanup temporary file
   */
  private async cleanupTempFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      this.logger.log(`Cleaned up temp file: ${filePath}`);
    } catch (error) {
      this.logger.warn(error);
    }
  }

  /**
   * Validate file before upload
   */
  private async validateFileBeforeUpload(filePath: string) {
    let validation: {
      size: number;
      exists: boolean;
      isFile: boolean;
    } | null = null;

    try {
      const stats = await fs.stat(filePath);

      validation = {
        size: stats.size,
        exists: true,
        isFile: stats.isFile(),
      };
    } catch (error) {
      this.logger.error(`Error validating file: ${JSON.stringify(error)}`);

      validation = {
        size: 0,
        exists: false,
        isFile: false,
      };
    }

    if (!validation.exists) {
      throwHttpException({
        type: "notFound",
        message: `File not found: ${filePath}`,
      });
    }

    if (!validation.isFile) {
      throwHttpException({
        type: "badRequest",
        message: `Path is not a file: ${filePath}`,
      });
    }

    if (validation.size === 0) {
      throwHttpException({
        type: "badRequest",
        message: `File is empty: ${filePath}`,
      });
    }
  }

  /**
   * Upload small file with PutObjectCommand (< 100MB)
   */
  async uploadFileFromBuffer({
    buffer,
    fileName,
    mimeType,
    folder = UPLOAD_S3_DESTINATIONS.IMAGES,
  }: {
    buffer: Buffer;
    fileName: string;
    mimeType: string;
    folder?: string;
  }): Promise<{
    url: string;
  }> {
    try {
      const appConfig = this.appConfigService.appConfig;

      // Get the file extension
      const fileExtension = path.extname(fileName);

      // Format: filename_timestamp.extension
      const uniqueFileName = `${fileName.replace(fileExtension, "")}_${new Date().getTime()}${fileExtension}`;

      const key = `${folder}/${uniqueFileName}`;

      const command = new PutObjectCommand({
        Bucket: appConfig.s3BucketName,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        Metadata: {
          originalName: fileName,
          uploadedAt: new Date().toISOString(),
        },
        ServerSideEncryption: "AES256",
      });

      const result = await this.s3.send(command);

      // Get public URL
      // Note: Ensure your S3 bucket is configured to allow public access to the files
      // or use a pre-signed URL if you want to restrict access.
      const url = this.getPublicUrl(key);

      this.logger.log(`File uploaded successfully: ${JSON.stringify(result)}`);

      return {
        url,
      };
    } catch (error) {
      this.logger.error(error);

      throwHttpException({
        type: "internal",
        message: "Failed to upload file to S3.",
      });
    }
  }

  /**
   * Upload large file with multipart upload (@aws-sdk/lib-storage)
   */
  async uploadLargeFileFromBuffer({
    buffer,
    fileName,
    mimeType,
    folder = UPLOAD_S3_DESTINATIONS.IMAGES,
    partSize = 1024 * 1024 * 5, // 5MB per part
    queueSize = 4, // Số part upload đồng thời
    progressCallback,
  }: {
    buffer: Buffer;
    fileName: string;
    mimeType: string;
    folder?: string;
    partSize?: number;
    queueSize?: number;
    progressCallback?: (progress: {
      loaded: number;
      total: number;
      part: number;
    }) => void;
  }): Promise<{
    url: string;
  }> {
    try {
      const appConfig = this.appConfigService.appConfig;

      // Get the file extension
      const fileExtension = path.extname(fileName);

      // Format: filename_timestamp.extension
      const uniqueFileName = `${fileName.replace(fileExtension, "")}_${new Date().getTime()}${fileExtension}`;

      const key = `${folder}/${uniqueFileName}`;

      const upload = new Upload({
        client: this.s3,
        params: {
          Bucket: appConfig.s3BucketName,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
          Metadata: {
            originalName: fileName,
            uploadedAt: new Date().toISOString(),
          },
          ServerSideEncryption: "AES256",
        },
        partSize,
        queueSize,
      });

      // Theo dõi progress nếu có callback
      if (progressCallback) {
        upload.on("httpUploadProgress", (progress) => {
          progressCallback({
            loaded: progress.loaded || 0,
            total: progress.total || 0,
            part: progress.part || 0,
          });
        });
      }

      const result = await upload.done();

      this.logger.log(`File uploaded successfully: ${JSON.stringify(result)}`);

      // Get public URL
      // Note: Ensure your S3 bucket is configured to allow public access to the files
      // or use a pre-signed URL if you want to restrict access.
      const url = this.getPublicUrl(key);

      return {
        url,
      };
    } catch (error) {
      this.logger.error(error);

      throwHttpException({
        type: "internal",
        message: "Failed to upload file to S3.",
      });
    }
  }

  /**
   * Xóa file từ S3
   */
  async deleteFile({ key }: { key: string }): Promise<{
    message: string;
  }> {
    // Check if file exists before deleting
    await this.checkFileExists(key);

    try {
      const appConfig = this.appConfigService.appConfig;

      const command = new DeleteObjectCommand({
        Bucket: appConfig.s3BucketName,
        Key: key,
      });

      const result = await this.s3.send(command);
      this.logger.log(`File deleted successfully: ${JSON.stringify(result)}`);

      return {
        message: `File ${key} deleted successfully.`,
      };
    } catch (error) {
      this.logger.error(error);
      throwHttpException({
        type: "internal",
        message: "Failed to delete file from S3.",
      });
    }
  }

  /**
   * Auto-detect and use the appropriate upload method based on file size.
   * If file size is greater than 100MB, use multipart upload.
   * Otherwise, use simple upload.
   */
  async smartUploadFromBuffer({
    buffer,
    fileName,
    mimeType,
    folder = "uploads",
    progressCallback,
  }: {
    buffer: Buffer;
    fileName: string;
    mimeType: string;
    folder?: string;
    progressCallback?: (progress: {
      loaded: number;
      total: number;
      part?: number;
    }) => void;
  }) {
    const fileSize = buffer.length;
    const SIZE_THRESHOLD = 100 * 1024 * 1024; // 100MB

    if (fileSize > SIZE_THRESHOLD) {
      this.logger.log(
        `Using multipart upload for large file: ${fileName} (${fileSize} bytes)`,
      );
      return this.uploadLargeFileFromBuffer({
        buffer,
        fileName,
        mimeType,
        folder,
        progressCallback,
      });
    } else {
      this.logger.log(
        `Using simple upload for file: ${fileName} (${fileSize} bytes)`,
      );

      return this.uploadFileFromBuffer({
        buffer,
        fileName,
        mimeType,
        folder,
      });
    }
  }

  /**
   * Generate pre-signed URL for downloading files
   * This is useful when you want to provide temporary access to private files
   */
  async generatePresignedDownloadUrl({
    key,
    expiresIn = 3600, // 1 hour default
    responseContentType,
    responseContentDisposition,
  }: {
    key: string;
    expiresIn?: number; // Time in seconds
    responseContentType?: string;
    responseContentDisposition?: string; // e.g., "attachment; filename=myfile.pdf"
  }): Promise<{
    downloadUrl: string;
  }> {
    try {
      const appConfig = this.appConfigService.appConfig;

      const command = new GetObjectCommand({
        Bucket: appConfig.s3BucketName,
        Key: key,
        ResponseContentType: responseContentType,
        ResponseContentDisposition: responseContentDisposition,
      });

      const downloadUrl = await getSignedUrl(this.s3, command, {
        expiresIn,
      });

      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      this.logger.log(
        `Generated download URL for key: ${key}, expires at: ${expiresAt.toISOString()}`,
      );

      return {
        downloadUrl,
      };
    } catch (error) {
      this.logger.error(error);

      throwHttpException({
        type: "internal",
        message: "Failed to generate download URL.",
      });
    }
  }

  /**
   * Check if file exists in S3 before generating download URL
   */
  async generateSecureDownloadUrl({
    key,
    expiresIn = 3600,
  }: {
    key: string;
    expiresIn?: number;
  }): Promise<{
    downloadUrl: string;
  }> {
    // Optionally check if file exists first
    await this.checkFileExists(key);

    try {
      const result = await this.generatePresignedDownloadUrl({
        key,
        expiresIn,
      });

      return result;
    } catch (error) {
      this.logger.error(error);

      throwHttpException({
        type: "internal",
        message: "Failed to generate secure download URL.",
      });
    }
  }

  /**
   * Helper method to check if file exists in S3
   */
  private async checkFileExists(key: string): Promise<boolean> {
    try {
      const appConfig = this.appConfigService.appConfig;

      const command = new GetObjectCommand({
        Bucket: appConfig.s3BucketName,
        Key: key,
      });

      // Just check if we can get object metadata
      await this.s3.send(command);

      return true;
    } catch (error) {
      this.logger.error(
        `Error checking if file exists in S3 for key ${JSON.stringify(error)}`,
      );

      // For other errors, re-throw
      throwHttpException({
        type: "notFound",
        message: "File not found in S3.",
      });
    }
  }
}
