import { PRESIGNED_URL_TYPE } from "@/constants/upload.constant";

import { MediaService } from "../media.service";

import {
  setupMediaService,
  MediaServiceMocks,
} from "./media-service-test-harness";

describe("MediaService - getPresignedUrl", () => {
  let service: MediaService;
  let mocks: MediaServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupMediaService());
  });

  it("generates an upload presigned URL when type is upload", async () => {
    // Arrange
    mocks.s3Service.generatePresignedUploadUrl.mockResolvedValue({
      uploadUrl: "https://s3.example.com/upload?signature=abc123",
    });

    // Act
    const result = await service.getPresignedUrl({
      key: "images/product-123.jpg",
      type: PRESIGNED_URL_TYPE.UPLOAD,
    });

    // Assert
    expect(mocks.s3Service.generatePresignedUploadUrl).toHaveBeenCalledWith({
      key: "images/product-123.jpg",
    });
    expect(mocks.s3Service.generatePresignedDownloadUrl).not.toHaveBeenCalled();
    expect(result).toEqual({
      url: "https://s3.example.com/upload?signature=abc123",
    });
  });

  it("generates a download presigned URL when type is download", async () => {
    // Arrange
    mocks.s3Service.generatePresignedDownloadUrl.mockResolvedValue({
      downloadUrl: "https://s3.example.com/download?signature=xyz789",
    });

    // Act
    const result = await service.getPresignedUrl({
      key: "images/product-456.jpg",
      type: PRESIGNED_URL_TYPE.DOWNLOAD,
    });

    // Assert
    expect(mocks.s3Service.generatePresignedDownloadUrl).toHaveBeenCalledWith({
      key: "images/product-456.jpg",
    });
    expect(mocks.s3Service.generatePresignedUploadUrl).not.toHaveBeenCalled();
    expect(result).toEqual({
      url: "https://s3.example.com/download?signature=xyz789",
    });
  });

  it("returns the upload URL untouched", async () => {
    // Arrange
    const uploadUrl = "https://s3.example.com/presigned/upload";
    mocks.s3Service.generatePresignedUploadUrl.mockResolvedValue({
      uploadUrl,
    });

    // Act
    const result = await service.getPresignedUrl({
      key: "test-key",
      type: PRESIGNED_URL_TYPE.UPLOAD,
    });

    // Assert
    expect(result.url).toBe(uploadUrl);
  });

  it("returns the download URL untouched", async () => {
    // Arrange
    const downloadUrl = "https://s3.example.com/presigned/download";
    mocks.s3Service.generatePresignedDownloadUrl.mockResolvedValue({
      downloadUrl,
    });

    // Act
    const result = await service.getPresignedUrl({
      key: "test-key",
      type: PRESIGNED_URL_TYPE.DOWNLOAD,
    });

    // Assert
    expect(result.url).toBe(downloadUrl);
  });

  it("propagates S3 upload URL generation failure", async () => {
    // Arrange
    const error = new Error("URL generation failed");
    mocks.s3Service.generatePresignedUploadUrl.mockRejectedValue(error);

    // Act
    const promise = service.getPresignedUrl({
      key: "test-key",
      type: PRESIGNED_URL_TYPE.UPLOAD,
    });

    // Assert
    await expect(promise).rejects.toBe(error);
  });

  it("propagates S3 download URL generation failure", async () => {
    // Arrange
    const error = new Error("Download URL generation failed");
    mocks.s3Service.generatePresignedDownloadUrl.mockRejectedValue(error);

    // Act
    const promise = service.getPresignedUrl({
      key: "test-key",
      type: PRESIGNED_URL_TYPE.DOWNLOAD,
    });

    // Assert
    await expect(promise).rejects.toBe(error);
  });
});
