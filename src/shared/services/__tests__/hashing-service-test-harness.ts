import { Test } from "@nestjs/testing";

import { HashingService } from "../hashing.service";

export const createHashingServiceMocks = () => ({
  // No external dependencies - bcrypt is mocked at module level
});

export type HashingServiceMocks = ReturnType<typeof createHashingServiceMocks>;

export const buildHashingService = async (): Promise<HashingService> => {
  const moduleRef = await Test.createTestingModule({
    providers: [HashingService],
  }).compile();

  return moduleRef.get<HashingService>(HashingService);
};

export const setupHashingService = async () => {
  const service = await buildHashingService();

  return { service };
};

export const containing = <T extends Record<string, unknown>>(shape: T): T =>
  expect.objectContaining(shape) as unknown as T;
