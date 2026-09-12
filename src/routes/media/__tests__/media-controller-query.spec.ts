import { UnprocessableEntityException } from "@nestjs/common";

import {
  PresignedUrlResponseDto,
  DeleteFileResponseDto,
} from "@/dtos/media/media.dto";

import { MediaController } from "../media.controller";

import {
  MediaControllerMocks,
  makeDeleteResponse,
  makePresignedUrlResponse,
  setupMediaController,
} from "./media-controller-test-harness";

describe("MediaController - getPresignedUrl", () => {
  let controller: MediaController;
  let mocks: MediaControllerMocks;

  const makePresignedQuery = (type: "upload" | "download" = "upload") => ({
    key: "path/to/file.jpg",
    type,
  });

  beforeEach(async () => {
    ({ controller, mocks } = await setupMediaController());
  });

  it("calls mediaService.getPresignedUrl with the query", async () => {
    // Arrange
    const query = makePresignedQuery("upload");
    mocks.mediaService.getPresignedUrl.mockResolvedValue(
      makePresignedUrlResponse(),
    );

    // Act
    await controller.getPresignedUrl(query);

    // Assert
    expect(mocks.mediaService.getPresignedUrl).toHaveBeenCalledWith(query);
  });

  it("returns the response wrapped in PresignedUrlResponseDto", async () => {
    // Arrange
    const query = makePresignedQuery("download");
    mocks.mediaService.getPresignedUrl.mockResolvedValue(
      makePresignedUrlResponse({
        url: "https://s3.amazonaws.com/bucket/presigned?token=xyz",
      }),
    );

    // Act
    const result = await controller.getPresignedUrl(query);

    // Assert
    expect(result).toBeInstanceOf(PresignedUrlResponseDto);
    expect(result.url).toContain("presigned");
  });

  it("supports upload type", async () => {
    // Arrange
    const query = { key: "uploads/new.jpg", type: "upload" as const };
    mocks.mediaService.getPresignedUrl.mockResolvedValue(
      makePresignedUrlResponse(),
    );

    // Act
    await controller.getPresignedUrl(query);

    // Assert
    expect(mocks.mediaService.getPresignedUrl).toHaveBeenCalledWith(query);
  });

  it("supports download type", async () => {
    // Arrange
    const query = { key: "downloads/file.jpg", type: "download" as const };
    mocks.mediaService.getPresignedUrl.mockResolvedValue(
      makePresignedUrlResponse(),
    );

    // Act
    await controller.getPresignedUrl(query);

    // Assert
    expect(mocks.mediaService.getPresignedUrl).toHaveBeenCalledWith(query);
  });

  it("propagates rejection from mediaService", async () => {
    // Arrange
    const query = makePresignedQuery("download");
    const error = new UnprocessableEntityException("Invalid key");
    mocks.mediaService.getPresignedUrl.mockRejectedValue(error);

    // Act & Assert
    await expect(controller.getPresignedUrl(query)).rejects.toBe(error);
  });
});

describe("MediaController - deleteMedia", () => {
  let controller: MediaController;
  let mocks: MediaControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupMediaController());
  });

  it("calls mediaService.deleteMedia with the query", async () => {
    // Arrange
    const query = { key: "path/to/file.jpg" };
    mocks.mediaService.deleteMedia.mockResolvedValue(makeDeleteResponse());

    // Act
    await controller.deleteMedia(query);

    // Assert
    expect(mocks.mediaService.deleteMedia).toHaveBeenCalledWith(query);
  });

  it("returns the response wrapped in DeleteFileResponseDto", async () => {
    // Arrange
    const query = { key: "path/to/file.jpg" };
    mocks.mediaService.deleteMedia.mockResolvedValue({
      message: "File deleted",
    });

    // Act
    const result = await controller.deleteMedia(query);

    // Assert
    expect(result).toBeInstanceOf(DeleteFileResponseDto);
  });

  it("handles deletion of uploaded files", async () => {
    // Arrange
    const query = { key: "uploads/old-file.jpg" };
    mocks.mediaService.deleteMedia.mockResolvedValue(
      makeDeleteResponse({ message: "File deleted successfully" }),
    );

    // Act
    const result = await controller.deleteMedia(query);

    // Assert
    expect(result).toBeInstanceOf(DeleteFileResponseDto);
  });

  it("propagates rejection from mediaService when file not found", async () => {
    // Arrange
    const query = { key: "nonexistent.jpg" };
    const error = new UnprocessableEntityException("File not found");
    mocks.mediaService.deleteMedia.mockRejectedValue(error);

    // Act & Assert
    await expect(controller.deleteMedia(query)).rejects.toBe(error);
  });

  it("propagates rejection from mediaService on S3 error", async () => {
    // Arrange
    const query = { key: "path/to/file.jpg" };
    const error = new UnprocessableEntityException("S3 error: access denied");
    mocks.mediaService.deleteMedia.mockRejectedValue(error);

    // Act & Assert
    await expect(controller.deleteMedia(query)).rejects.toBe(error);
  });
});
