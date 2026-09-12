import { Readable } from "stream";

import { Test } from "@nestjs/testing";

import { AppConfigService } from "../app-config.service";
import { S3Service } from "../s3.service";

// Skip module initialization that depends on fs
process.env.AWS_SDK_LOAD_CONFIG = "false";

export interface CommandInput {
  Bucket?: string;
  Key?: string;
  [key: string]: unknown;
}

export interface CommandInstance {
  input: CommandInput;
}

interface S3ClientMock {
  send: jest.Mock<Promise<unknown>, [CommandInstance]>;
  listBuckets: jest.Mock<Promise<{ Buckets: Array<{ Name: string }> }>, []>;
}

interface S3ServiceConfig {
  s3Region: string;
  s3AccessKey: string;
  s3SecretKey: string;
  s3BucketName: string;
}

export const createS3ServiceMocks = () => {
  const mockSend = jest.fn<Promise<unknown>, [CommandInstance]>();
  const mockS3Client: S3ClientMock = {
    send: mockSend,
    listBuckets: jest
      .fn<Promise<{ Buckets: Array<{ Name: string }> }>, []>()
      .mockResolvedValue({
        Buckets: [{ Name: "test-bucket" }],
      }),
  };

  return {
    s3Client: mockS3Client,
    send: mockSend,
    appConfigService: {
      appConfig: {
        s3Region: "us-east-1",
        s3AccessKey: "test-access-key",
        s3SecretKey: "test-secret-key",
        s3BucketName: "test-bucket",
      } as S3ServiceConfig,
    },
  };
};

export type S3ServiceMocks = ReturnType<typeof createS3ServiceMocks>;

export const buildS3Service = async (
  mocks: S3ServiceMocks,
): Promise<S3Service> => {
  // Mock the S3 constructor
  const { S3 } = require("@aws-sdk/client-s3");
  S3.mockImplementation(() => mocks.s3Client);

  const moduleRef = await Test.createTestingModule({
    providers: [
      S3Service,
      { provide: AppConfigService, useValue: mocks.appConfigService },
    ],
  }).compile();

  return moduleRef.get<S3Service>(S3Service);
};

export const setupS3Service = async () => {
  const mocks = createS3ServiceMocks();
  const service = await buildS3Service(mocks);

  return { mocks, service };
};

export const makeFile = (overrides: Record<string, unknown> = {}) => ({
  path: "/tmp/test-file.jpg",
  name: "test-file.jpg",
  mimeType: "image/jpeg",
  buffer: Buffer.from("test content"),
  ...overrides,
});

export const makeBuffer = (size: number = 1024): Buffer =>
  Buffer.alloc(size, "test");

export const makeReadStream = (): Readable => {
  const stream = new Readable();
  stream.push("test content");
  stream.push(null);
  return stream;
};

export const containing = <T extends Record<string, unknown>>(shape: T): T =>
  expect.objectContaining(shape) as unknown as T;

export const anyDate = (): Date => expect.any(Date) as unknown as Date;

/**
 * S3-style error with metadata. Used to simulate AWS SDK errors that carry
 * httpStatusCode in $metadata, which the service checks for error discrimination.
 */
export const makeS3Error = (
  code: string,
  statusCode: number,
): Error & { name: string; $metadata: { httpStatusCode: number } } => {
  const error = new Error(code);
  error.name = code;
  (error as unknown as { $metadata: { httpStatusCode: number } }).$metadata = {
    httpStatusCode: statusCode,
  };
  return error as Error & {
    name: string;
    $metadata: { httpStatusCode: number };
  };
};
