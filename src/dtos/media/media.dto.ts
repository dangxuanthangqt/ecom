import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsIn, IsString } from "class-validator";

import {
  PRESIGNED_URL_TYPE,
  PresignedUrlType,
} from "@/constants/upload.constant";

export class PresignedUrlQueryDto {
  @ApiProperty({
    description: "The S3 key/path of the file",
    example: "images/profile/avatar.jpg",
    type: String,
  })
  @IsString()
  key: string;

  @ApiProperty({
    description: "Type of presigned URL",
    enum: [PRESIGNED_URL_TYPE.UPLOAD, PRESIGNED_URL_TYPE.DOWNLOAD],
    example: PRESIGNED_URL_TYPE.UPLOAD,
  })
  @IsIn([PRESIGNED_URL_TYPE.UPLOAD, PRESIGNED_URL_TYPE.DOWNLOAD], {
    message: `type must be one of: ${Object.values(PRESIGNED_URL_TYPE).join(", ")}`,
  })
  type: PresignedUrlType;

  constructor(partial: PresignedUrlQueryDto) {
    Object.assign(this, partial);
  }
}

export class PresignedUrlResponseDto {
  @ApiProperty({
    description: "The generated presigned URL",
    example:
      "https://bucket-name.s3.region.amazonaws.com/images/profile/avatar.jpg?X-Amz-Algorithm=...",
    type: String,
  })
  @Expose()
  url: string;

  constructor(partial: PresignedUrlResponseDto) {
    Object.assign(this, partial);
  }
}

export class UploadFileResponseDto {
  @ApiProperty({
    description: "The URL of the uploaded file",
    example:
      "https://bucket-name.s3.region.amazonaws.com/images/profile/avatar.jpg",
    type: String,
  })
  @Expose()
  url: string;

  constructor(partial: UploadFileResponseDto) {
    Object.assign(this, partial);
  }
}

export class UploadFilesResponseDto {
  @ApiProperty({
    description: "Array of URLs of the uploaded files",
    example: [
      "https://bucket-name.s3.region.amazonaws.com/images/profile/avatar1.jpg",
      "https://bucket-name.s3.region.amazonaws.com/images/profile/avatar2.jpg",
    ],
    type: [String],
  })
  @Expose()
  urls: string[];

  constructor(partial: UploadFilesResponseDto) {
    Object.assign(this, partial);
  }
}

export class DeleteFileQueryDto {
  @ApiProperty({
    description: "The S3 key/path of the file",
    example: "images/profile/avatar.jpg",
    type: String,
  })
  @IsString()
  key: string;

  constructor(partial: DeleteFileQueryDto) {
    Object.assign(this, partial);
  }
}

export class DeleteFileResponseDto {
  @ApiProperty({
    description: "Confirmation message after file deletion",
    example: "File deleted successfully.",
    type: String,
  })
  @Expose()
  message: string;

  constructor(partial: DeleteFileResponseDto) {
    Object.assign(this, partial);
  }
}
