import { Readable } from "stream";

import { Test } from "@nestjs/testing";

import { S3Service } from "@/shared/services/s3.service";

import { MediaService } from "../media.service";

/**
 * Test doubles for every collaborator MediaService depends on.
 * Only the methods MediaService actually calls are stubbed.
 */
export const createMediaServiceMocks = () => ({
  s3Service: {
    uploadSimpleFileFromDisk: jest.fn(),
    uploadLargeFileFromDisk: jest.fn(),
    uploadFileFromBuffer: jest.fn(),
    uploadLargeFileFromBuffer: jest.fn(),
    generatePresignedUploadUrl: jest.fn(),
    generatePresignedDownloadUrl: jest.fn(),
    deleteFile: jest.fn(),
  },
});

export type MediaServiceMocks = ReturnType<typeof createMediaServiceMocks>;

/** Builds MediaService through the Nest DI container with all deps mocked. */
export const buildMediaService = async (
  mocks: MediaServiceMocks,
): Promise<MediaService> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      MediaService,
      {
        provide: S3Service,
        useValue: mocks.s3Service,
      },
    ],
  }).compile();

  return moduleRef.get<MediaService>(MediaService);
};

/** Boilerplate for a fresh service + mocks per test. */
export const setupMediaService = async () => {
  const mocks = createMediaServiceMocks();
  const service = await buildMediaService(mocks);

  return { mocks, service };
};

/** A mock file object as Express.Multer provides it. */
export const makeFile = (
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File => {
  return {
    fieldname: "file",
    originalname: "test.jpg",
    encoding: "7bit",
    mimetype: "image/jpeg",
    size: 1024,
    destination: "./uploads/temp",
    filename: "test.jpg",
    path: "./uploads/temp/test.jpg",
    buffer: Buffer.from("fake-image-data"),
    stream: new Readable(),
    ...overrides,
  } as Express.Multer.File;
};

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
