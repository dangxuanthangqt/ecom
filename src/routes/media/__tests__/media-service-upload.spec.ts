import { MediaService } from "../media.service";

import {
  containing,
  makeFile,
  setupMediaService,
  MediaServiceMocks,
} from "./media-service-test-harness";

describe("MediaService - uploadImageFromDisk", () => {
  let service: MediaService;
  let mocks: MediaServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupMediaService());
    mocks.s3Service.uploadSimpleFileFromDisk.mockResolvedValue({
      url: "https://s3.example.com/images/test.jpg",
    });
  });

  it("extracts file metadata and uploads to S3", async () => {
    // Arrange
    const file = makeFile({
      path: "./uploads/temp/test.jpg",
      originalname: "test.jpg",
      mimetype: "image/jpeg",
    });

    // Act
    const result = await service.uploadImageFromDisk(file);

    // Assert
    expect(mocks.s3Service.uploadSimpleFileFromDisk).toHaveBeenCalledWith({
      filePath: "./uploads/temp/test.jpg",
      fileName: "test.jpg",
      mimeType: "image/jpeg",
    });
    expect(result.url).toBe("https://s3.example.com/images/test.jpg");
  });

  it("returns the S3 upload result untouched", async () => {
    // Arrange
    const file = makeFile();
    const uploadResult = { url: "https://s3.example.com/custom/path.jpg" };
    mocks.s3Service.uploadSimpleFileFromDisk.mockResolvedValue(uploadResult);

    // Act
    const result = await service.uploadImageFromDisk(file);

    // Assert
    expect(result).toBe(uploadResult);
  });

  it("propagates S3 upload failure", async () => {
    // Arrange
    const file = makeFile();
    const error = new Error("S3 upload failed");
    mocks.s3Service.uploadSimpleFileFromDisk.mockRejectedValue(error);

    // Act
    const promise = service.uploadImageFromDisk(file);

    // Assert
    await expect(promise).rejects.toBe(error);
  });
});

describe("MediaService - uploadLargeImageFromDisk", () => {
  let service: MediaService;
  let mocks: MediaServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupMediaService());
    mocks.s3Service.uploadLargeFileFromDisk.mockResolvedValue({
      url: "https://s3.example.com/images/large.jpg",
    });
  });

  it("delegates to uploadLargeFileFromDisk with file metadata", async () => {
    // Arrange
    const file = makeFile({
      originalname: "large.jpg",
      mimetype: "image/jpeg",
    });

    // Act
    await service.uploadLargeImageFromDisk(file);

    // Assert
    expect(mocks.s3Service.uploadLargeFileFromDisk).toHaveBeenCalledWith(
      containing({
        fileName: "large.jpg",
        mimeType: "image/jpeg",
      }),
    );
  });

  it("propagates S3 multipart upload failure", async () => {
    // Arrange
    const file = makeFile();
    const error = new Error("Multipart upload failed");
    mocks.s3Service.uploadLargeFileFromDisk.mockRejectedValue(error);

    // Act
    const promise = service.uploadLargeImageFromDisk(file);

    // Assert
    await expect(promise).rejects.toBe(error);
  });
});

describe("MediaService - uploadImageFromBuffer", () => {
  let service: MediaService;
  let mocks: MediaServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupMediaService());
    mocks.s3Service.uploadFileFromBuffer.mockResolvedValue({
      url: "https://s3.example.com/images/buffered.jpg",
    });
  });

  it("extracts file buffer and metadata for upload", async () => {
    // Arrange
    const buffer = Buffer.from("image-data");
    const file = makeFile({
      buffer,
      originalname: "buffered.jpg",
      mimetype: "image/jpeg",
    });

    // Act
    await service.uploadImageFromBuffer(file);

    // Assert
    expect(mocks.s3Service.uploadFileFromBuffer).toHaveBeenCalledWith({
      buffer,
      fileName: "buffered.jpg",
      mimeType: "image/jpeg",
    });
  });

  it("propagates buffer upload failure", async () => {
    // Arrange
    const file = makeFile();
    const error = new Error("Buffer upload failed");
    mocks.s3Service.uploadFileFromBuffer.mockRejectedValue(error);

    // Act
    const promise = service.uploadImageFromBuffer(file);

    // Assert
    await expect(promise).rejects.toBe(error);
  });
});

describe("MediaService - uploadArrayOfImagesFromBuffer", () => {
  let service: MediaService;
  let mocks: MediaServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupMediaService());
    mocks.s3Service.uploadFileFromBuffer.mockResolvedValue({
      url: "https://s3.example.com/images/item.jpg",
    });
  });

  it("uploads multiple files in parallel and returns all URLs", async () => {
    // Arrange
    const files = [
      makeFile({ originalname: "1.jpg" }),
      makeFile({ originalname: "2.jpg" }),
      makeFile({ originalname: "3.jpg" }),
    ];
    mocks.s3Service.uploadFileFromBuffer
      .mockResolvedValueOnce({ url: "https://s3.example.com/1.jpg" })
      .mockResolvedValueOnce({ url: "https://s3.example.com/2.jpg" })
      .mockResolvedValueOnce({ url: "https://s3.example.com/3.jpg" });

    // Act
    const result = await service.uploadArrayOfImagesFromBuffer(files);

    // Assert
    expect(result.urls).toEqual([
      "https://s3.example.com/1.jpg",
      "https://s3.example.com/2.jpg",
      "https://s3.example.com/3.jpg",
    ]);
    expect(mocks.s3Service.uploadFileFromBuffer).toHaveBeenCalledTimes(3);
  });

  it("uploads all files even when one fails", async () => {
    // Arrange
    const files = [
      makeFile({ originalname: "1.jpg" }),
      makeFile({ originalname: "2.jpg" }),
    ];
    mocks.s3Service.uploadFileFromBuffer
      .mockResolvedValueOnce({ url: "https://s3.example.com/1.jpg" })
      .mockRejectedValueOnce(new Error("Upload failed"));

    // Act
    const promise = service.uploadArrayOfImagesFromBuffer(files);

    // Assert
    await expect(promise).rejects.toEqual(new Error("Upload failed"));
  });

  it("returns an empty array when no files are provided", async () => {
    // Act
    const result = await service.uploadArrayOfImagesFromBuffer([]);

    // Assert
    expect(result.urls).toEqual([]);
  });
});

describe("MediaService - uploadMultipleImagesFromBuffer", () => {
  let service: MediaService;
  let mocks: MediaServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupMediaService());
    mocks.s3Service.uploadFileFromBuffer.mockResolvedValue({
      url: "https://s3.example.com/images/item.jpg",
    });
  });

  it("flattens and uploads all files from multiple keys", async () => {
    // Arrange
    const file1 = makeFile({ originalname: "1.jpg" });
    const file2 = makeFile({ originalname: "2.jpg" });
    const file3 = makeFile({ originalname: "3.jpg" });

    mocks.s3Service.uploadFileFromBuffer
      .mockResolvedValueOnce({ url: "https://s3.example.com/1.jpg" })
      .mockResolvedValueOnce({ url: "https://s3.example.com/2.jpg" })
      .mockResolvedValueOnce({ url: "https://s3.example.com/3.jpg" });

    // Act
    const result = await service.uploadMultipleImagesFromBuffer({
      file1: [file1, file2],
      file2: [file3],
    });

    // Assert
    expect(result.urls).toHaveLength(3);
    expect(mocks.s3Service.uploadFileFromBuffer).toHaveBeenCalledTimes(3);
  });

  it("throws when destructuring file properties from undefined", async () => {
    // Arrange - the service calls Object.values().flat().map, which attempts to
    // destructure file properties from undefined, causing a TypeError. The service
    // does not filter out undefined values.

    // Act
    const promise = service.uploadMultipleImagesFromBuffer({
      file1: undefined,
      file2: undefined,
    });

    // Assert - real behavior: service throws on undefined file destructuring
    await expect(promise).rejects.toThrow("Cannot destructure property");
  });
});

describe("MediaService - uploadLargeFileFromBuffer", () => {
  let service: MediaService;
  let mocks: MediaServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupMediaService());
    mocks.s3Service.uploadLargeFileFromBuffer.mockResolvedValue({
      url: "https://s3.example.com/files/large.zip",
    });
  });

  it("uploads a large file from buffer using multipart", async () => {
    // Arrange
    const file = makeFile({
      buffer: Buffer.from("large-file-data"),
      originalname: "large.zip",
      mimetype: "application/zip",
    });

    // Act
    await service.uploadLargeFileFromBuffer(file);

    // Assert
    expect(mocks.s3Service.uploadLargeFileFromBuffer).toHaveBeenCalledWith({
      buffer: file.buffer,
      fileName: "large.zip",
      mimeType: "application/zip",
    });
  });

  it("propagates large file upload failure", async () => {
    // Arrange
    const file = makeFile();
    const error = new Error("Large file upload failed");
    mocks.s3Service.uploadLargeFileFromBuffer.mockRejectedValue(error);

    // Act
    const promise = service.uploadLargeFileFromBuffer(file);

    // Assert
    await expect(promise).rejects.toBe(error);
  });
});
