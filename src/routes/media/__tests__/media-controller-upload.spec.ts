import { UnprocessableEntityException } from "@nestjs/common";

import {
  UploadFileResponseDto,
  UploadFilesResponseDto,
} from "@/dtos/media/media.dto";

import { MediaController } from "../media.controller";

import {
  MediaControllerMocks,
  makeMullerFile,
  makeUploadResponse,
  setupMediaController,
} from "./media-controller-test-harness";

describe("MediaController - uploadLargeImageFromDisk", () => {
  let controller: MediaController;
  let mocks: MediaControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupMediaController());
  });

  it("calls mediaService.uploadLargeImageFromDisk with the file", async () => {
    // Arrange
    const file = makeMullerFile({ originalname: "large-image.jpg" });
    mocks.mediaService.uploadLargeImageFromDisk.mockResolvedValue(
      makeUploadResponse(),
    );

    // Act
    await controller.uploadLargeImageFromDisk(file);

    // Assert
    expect(mocks.mediaService.uploadLargeImageFromDisk).toHaveBeenCalledWith(
      file,
    );
  });

  it("returns the upload response wrapped in UploadFileResponseDto", async () => {
    // Arrange
    const file = makeMullerFile();
    const serviceResponse = {
      url: "https://s3.amazonaws.com/bucket/test-file.jpg",
    };
    mocks.mediaService.uploadLargeImageFromDisk.mockResolvedValue(
      serviceResponse,
    );

    // Act
    const result = await controller.uploadLargeImageFromDisk(file);

    // Assert
    expect(result).toBeInstanceOf(UploadFileResponseDto);
    expect(result.url).toContain("test-file.jpg");
  });

  it("handles files with different MIME types", async () => {
    // Arrange
    const pngFile = makeMullerFile({
      originalname: "image.png",
      mimetype: "image/png",
    });
    mocks.mediaService.uploadLargeImageFromDisk.mockResolvedValue(
      makeUploadResponse(),
    );

    // Act
    await controller.uploadLargeImageFromDisk(pngFile);

    // Assert
    expect(mocks.mediaService.uploadLargeImageFromDisk).toHaveBeenCalledWith(
      pngFile,
    );
  });

  it("propagates rejection from mediaService on upload failure", async () => {
    // Arrange
    const file = makeMullerFile();
    const error = new UnprocessableEntityException("S3 upload failed");
    mocks.mediaService.uploadLargeImageFromDisk.mockRejectedValue(error);

    // Act & Assert
    await expect(controller.uploadLargeImageFromDisk(file)).rejects.toBe(error);
  });
});

describe("MediaController - uploadArrayOfImages", () => {
  let controller: MediaController;
  let mocks: MediaControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupMediaController());
  });

  it("calls mediaService.uploadArrayOfImagesFromBuffer with files array", async () => {
    // Arrange
    const files = [
      makeMullerFile({ originalname: "image1.jpg" }),
      makeMullerFile({ originalname: "image2.jpg" }),
    ];
    mocks.mediaService.uploadArrayOfImagesFromBuffer.mockResolvedValue({
      urls: ["url1", "url2"],
    });

    // Act
    await controller.uploadArrayOfImages(files);

    // Assert
    expect(
      mocks.mediaService.uploadArrayOfImagesFromBuffer,
    ).toHaveBeenCalledWith(files);
  });

  it("returns the upload response wrapped in UploadFilesResponseDto", async () => {
    // Arrange
    const files = [makeMullerFile(), makeMullerFile()];
    const serviceResponse = {
      urls: [
        "https://s3.amazonaws.com/bucket/file1.jpg",
        "https://s3.amazonaws.com/bucket/file2.jpg",
      ],
    };
    mocks.mediaService.uploadArrayOfImagesFromBuffer.mockResolvedValue(
      serviceResponse,
    );

    // Act
    const result = await controller.uploadArrayOfImages(files);

    // Assert
    expect(result).toBeInstanceOf(UploadFilesResponseDto);
    expect(result.urls).toHaveLength(2);
  });

  it("handles maximum file count", async () => {
    // Arrange
    const files = Array(10)
      .fill(null)
      .map((_, i) => makeMullerFile({ originalname: `image${i}.jpg` }));
    mocks.mediaService.uploadArrayOfImagesFromBuffer.mockResolvedValue({
      urls: files.map((_, i) => `url${i}`),
    });

    // Act
    await controller.uploadArrayOfImages(files);

    // Assert
    expect(
      mocks.mediaService.uploadArrayOfImagesFromBuffer,
    ).toHaveBeenCalledWith(files);
  });

  it("propagates rejection from mediaService on validation error", async () => {
    // Arrange
    const files = [makeMullerFile()];
    const error = new UnprocessableEntityException("Invalid file format");
    mocks.mediaService.uploadArrayOfImagesFromBuffer.mockRejectedValue(error);

    // Act & Assert
    await expect(controller.uploadArrayOfImages(files)).rejects.toBe(error);
  });

  it("propagates rejection from mediaService on S3 error", async () => {
    // Arrange
    const files = [makeMullerFile()];
    const error = new UnprocessableEntityException("S3 service unavailable");
    mocks.mediaService.uploadArrayOfImagesFromBuffer.mockRejectedValue(error);

    // Act & Assert
    await expect(controller.uploadArrayOfImages(files)).rejects.toBe(error);
  });
});

describe("MediaController - uploadMultipleImages", () => {
  let controller: MediaController;
  let mocks: MediaControllerMocks;

  const makeMultipleFilesPayload = () => ({
    file1: [makeMullerFile({ fieldname: "file1", originalname: "doc1.jpg" })],
    file3: [
      makeMullerFile({ fieldname: "file3", originalname: "doc3a.jpg" }),
      makeMullerFile({ fieldname: "file3", originalname: "doc3b.jpg" }),
    ],
  });

  beforeEach(async () => {
    ({ controller, mocks } = await setupMediaController());
  });

  it("calls mediaService.uploadMultipleImagesFromBuffer with files object", async () => {
    // Arrange
    const files = makeMultipleFilesPayload();
    mocks.mediaService.uploadMultipleImagesFromBuffer.mockResolvedValue({
      urls: ["url1", "url3a", "url3b"],
    });

    // Act
    await controller.uploadMultipleImages(files);

    // Assert
    expect(
      mocks.mediaService.uploadMultipleImagesFromBuffer,
    ).toHaveBeenCalledWith(files);
  });

  it("returns the upload response wrapped in UploadFilesResponseDto", async () => {
    // Arrange
    const files = makeMultipleFilesPayload();
    const serviceResponse = {
      urls: [
        "https://s3.amazonaws.com/bucket/doc1.jpg",
        "https://s3.amazonaws.com/bucket/doc3a.jpg",
        "https://s3.amazonaws.com/bucket/doc3b.jpg",
      ],
    };
    mocks.mediaService.uploadMultipleImagesFromBuffer.mockResolvedValue(
      serviceResponse,
    );

    // Act
    const result = await controller.uploadMultipleImages(files);

    // Assert
    expect(result).toBeInstanceOf(UploadFilesResponseDto);
    expect(result.urls).toHaveLength(3);
  });

  it("handles optional file fields", async () => {
    // Arrange
    const files = {
      file1: [makeMullerFile({ fieldname: "file1" })],
      // file3 is optional and may not be present
    };
    mocks.mediaService.uploadMultipleImagesFromBuffer.mockResolvedValue({
      urls: ["url1"],
    });

    // Act
    await controller.uploadMultipleImages(files);

    // Assert
    expect(
      mocks.mediaService.uploadMultipleImagesFromBuffer,
    ).toHaveBeenCalledWith(files);
  });

  it("handles all fields present with multiple files", async () => {
    // Arrange
    const files = {
      file1: [
        makeMullerFile({ fieldname: "file1", originalname: "avatar.jpg" }),
      ],
      file3: [
        makeMullerFile({ fieldname: "file3", originalname: "cert1.jpg" }),
        makeMullerFile({ fieldname: "file3", originalname: "cert2.jpg" }),
        makeMullerFile({ fieldname: "file3", originalname: "cert3.jpg" }),
      ],
    };
    mocks.mediaService.uploadMultipleImagesFromBuffer.mockResolvedValue({
      urls: ["url1", "url3a", "url3b", "url3c"],
    });

    // Act
    await controller.uploadMultipleImages(files);

    // Assert
    expect(
      mocks.mediaService.uploadMultipleImagesFromBuffer,
    ).toHaveBeenCalledWith(files);
  });

  it("propagates rejection from mediaService on file validation error", async () => {
    // Arrange
    const files = makeMultipleFilesPayload();
    const error = new UnprocessableEntityException(
      "file3 exceeds max file count",
    );
    mocks.mediaService.uploadMultipleImagesFromBuffer.mockRejectedValue(error);

    // Act & Assert
    await expect(controller.uploadMultipleImages(files)).rejects.toBe(error);
  });

  it("propagates rejection from mediaService on size validation error", async () => {
    // Arrange
    const files = makeMultipleFilesPayload();
    const error = new UnprocessableEntityException("file1 exceeds max size");
    mocks.mediaService.uploadMultipleImagesFromBuffer.mockRejectedValue(error);

    // Act & Assert
    await expect(controller.uploadMultipleImages(files)).rejects.toBe(error);
  });
});
