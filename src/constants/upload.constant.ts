export const UPLOAD_DESTINATIONS = {
  TEMP: "./uploads/temp",
} as const;

export const UPLOAD_S3_DESTINATIONS = {
  IMAGES: "images",
} as const;

export const PRESIGNED_URL_TYPE = {
  UPLOAD: "upload",
  DOWNLOAD: "download",
} as const;

export type PresignedUrlType =
  (typeof PRESIGNED_URL_TYPE)[keyof typeof PRESIGNED_URL_TYPE];
