import { Test } from "@nestjs/testing";

import { MediaController } from "../media.controller";
import { MediaService } from "../media.service";

/**
 * Test doubles for every collaborator MediaController depends on.
 * Only the methods MediaController actually calls are stubbed.
 */
export const createMediaControllerMocks = () => ({
  mediaService: {
    uploadLargeImageFromDisk: jest.fn(),
    uploadArrayOfImagesFromBuffer: jest.fn(),
    uploadMultipleImagesFromBuffer: jest.fn(),
    getPresignedUrl: jest.fn(),
    deleteMedia: jest.fn(),
  },
});

export type MediaControllerMocks = ReturnType<
  typeof createMediaControllerMocks
>;

/** Builds MediaController through the Nest DI container with all deps mocked. */
export const buildMediaController = async (
  mocks: MediaControllerMocks,
): Promise<MediaController> => {
  const moduleRef = await Test.createTestingModule({
    controllers: [MediaController],
    providers: [{ provide: MediaService, useValue: mocks.mediaService }],
  }).compile();

  return moduleRef.get<MediaController>(MediaController);
};

/** Boilerplate for a fresh controller + mocks per test. */
export const setupMediaController = async () => {
  const mocks = createMediaControllerMocks();
  const controller = await buildMediaController(mocks);

  return { mocks, controller };
};

/** A mock Express.Multer.File object. */
export const makeMullerFile = (
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File =>
  ({
    fieldname: "image",
    originalname: "test.jpg",
    encoding: "7bit",
    mimetype: "image/jpeg",
    size: 1024 * 100,
    destination: "/uploads",
    filename: "test-123.jpg",
    path: "/uploads/test-123.jpg",
    buffer: Buffer.from("fake-image-data"),
    ...overrides,
  }) as Express.Multer.File;

/** An upload response as the service returns it. */
export const makeUploadResponse = (
  overrides: Record<string, unknown> = {},
) => ({
  fileName: "test-123.jpg",
  fileUrl: "https://s3.amazonaws.com/bucket/test-123.jpg",
  fileSize: 102400,
  ...overrides,
});

/** A presigned URL response as the service returns it. */
export const makePresignedUrlResponse = (
  overrides: Record<string, unknown> = {},
) => ({
  presignedUrl: "https://s3.amazonaws.com/bucket/presigned-url?token=abc123",
  expiresIn: 3600,
  ...overrides,
});

/** A delete response as the service returns it. */
export const makeDeleteResponse = (
  overrides: Record<string, unknown> = {},
) => ({
  message: "File deleted successfully",
  ...overrides,
});

/**
 * `expect.objectContaining` typed back to the shape it matches, so nesting one
 * matcher inside another stays free of `any` leaking into the assertion.
 */
export const containing = <T extends Record<string, unknown>>(shape: T): T =>
  expect.objectContaining(shape) as unknown as T;

export const stringContaining = (substring: string): string =>
  expect.stringContaining(substring) as unknown as string;

export const anyObject = (): Record<string, unknown> =>
  expect.any(Object) as unknown as Record<string, unknown>;
