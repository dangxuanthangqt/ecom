import { MediaService } from "../media.service";

import {
  setupMediaService,
  MediaServiceMocks,
} from "./media-service-test-harness";

describe("MediaService - deleteMedia", () => {
  let service: MediaService;
  let mocks: MediaServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupMediaService());
    mocks.s3Service.deleteFile.mockResolvedValue({
      message: "File deleted successfully.",
    });
  });

  it("deletes a file from S3 by key", async () => {
    // Act
    await service.deleteMedia({ key: "images/product-123.jpg" });

    // Assert
    expect(mocks.s3Service.deleteFile).toHaveBeenCalledWith({
      key: "images/product-123.jpg",
    });
  });

  it("returns the S3 deletion result untouched", async () => {
    // Arrange
    const deleteResult = { message: "Successfully removed from S3." };
    mocks.s3Service.deleteFile.mockResolvedValue(deleteResult);

    // Act
    const result = await service.deleteMedia({ key: "test-key" });

    // Assert
    expect(result).toBe(deleteResult);
  });

  it("propagates S3 deletion failure", async () => {
    // Arrange
    const error = new Error("S3 delete failed");
    mocks.s3Service.deleteFile.mockRejectedValue(error);

    // Act
    const promise = service.deleteMedia({ key: "test-key" });

    // Assert
    await expect(promise).rejects.toBe(error);
  });

  it("deletes a file with complex nested key path", async () => {
    // Act
    await service.deleteMedia({
      key: "uploads/products/2026/01/123/abc.jpg",
    });

    // Assert
    expect(mocks.s3Service.deleteFile).toHaveBeenCalledWith({
      key: "uploads/products/2026/01/123/abc.jpg",
    });
  });
});
