import { Test } from "@nestjs/testing";

import { TwoFactorAuthenticationService } from "../2fa.service";

export const create2FAServiceMocks = () => ({
  // No external dependencies to mock
});

export type TwoFAServiceMocks = ReturnType<typeof create2FAServiceMocks>;

export const build2FAService =
  async (): Promise<TwoFactorAuthenticationService> => {
    const moduleRef = await Test.createTestingModule({
      providers: [TwoFactorAuthenticationService],
    }).compile();

    return moduleRef.get<TwoFactorAuthenticationService>(
      TwoFactorAuthenticationService,
    );
  };

export const setup2FAService = async () => {
  const service = await build2FAService();

  return { service };
};

export const containing = <T extends Record<string, unknown>>(shape: T): T =>
  expect.objectContaining(shape) as unknown as T;
