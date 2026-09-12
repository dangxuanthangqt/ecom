import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { Request, Response } from "express";

import { AppConfigService } from "@/shared/services/app-config.service";
import { PrismaService } from "@/shared/services/prisma.service";
import { TokenService } from "@/shared/services/token.service";

import { AccessTokenGuard } from "../access-token.guard";
import { ApiKeyGuard } from "../api-key.guard";
import { AuthorizationHeaderGuard } from "../authorization-header.guard";

export const createGuardMocks = () => ({
  tokenService: {
    verifyAccessToken: jest.fn(),
  },
  prismaService: {
    role: {
      findUniqueOrThrow: jest.fn(),
    },
  },
  appConfigService: {
    get: jest.fn(),
  },
  reflector: {
    getAllAndOverride: jest.fn(),
  },
});

export type GuardMocks = ReturnType<typeof createGuardMocks>;

export const buildAccessTokenGuard = async (
  mocks: GuardMocks,
): Promise<AccessTokenGuard> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      AccessTokenGuard,
      { provide: TokenService, useValue: mocks.tokenService },
      { provide: PrismaService, useValue: mocks.prismaService },
    ],
  }).compile();

  return moduleRef.get<AccessTokenGuard>(AccessTokenGuard);
};

export const buildApiKeyGuard = async (
  mocks: GuardMocks,
): Promise<ApiKeyGuard> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      ApiKeyGuard,
      { provide: AppConfigService, useValue: mocks.appConfigService },
    ],
  }).compile();

  return moduleRef.get<ApiKeyGuard>(ApiKeyGuard);
};

export const buildAuthorizationHeaderGuard = async (
  mocks: GuardMocks,
  accessTokenGuard: AccessTokenGuard,
  apiKeyGuard: ApiKeyGuard,
): Promise<AuthorizationHeaderGuard> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      AuthorizationHeaderGuard,
      { provide: Reflector, useValue: mocks.reflector },
      { provide: AccessTokenGuard, useValue: accessTokenGuard },
      { provide: ApiKeyGuard, useValue: apiKeyGuard },
    ],
  }).compile();

  return moduleRef.get<AuthorizationHeaderGuard>(AuthorizationHeaderGuard);
};

export const setupGuards = async () => {
  const mocks = createGuardMocks();
  const accessTokenGuard = await buildAccessTokenGuard(mocks);
  const apiKeyGuard = await buildApiKeyGuard(mocks);
  const authorizationHeaderGuard = await buildAuthorizationHeaderGuard(
    mocks,
    accessTokenGuard,
    apiKeyGuard,
  );

  return {
    mocks,
    accessTokenGuard,
    apiKeyGuard,
    authorizationHeaderGuard,
  };
};

export const makeExecutionContext = (
  request: Partial<Request> = {},
): ExecutionContext => {
  return {
    switchToHttp: jest.fn(() => ({
      getRequest: jest.fn(() => request),
      getResponse: jest.fn(() => ({}) as Response),
    })),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;
};

export const MOCK_ROLE_ID = "11111111-1111-4111-8111-111111111111";
export const MOCK_USER_ID = "22222222-2222-4222-8222-222222222222";
export const MOCK_DEVICE_ID = "33333333-3333-4333-8333-333333333333";

export const makeAccessTokenPayload = (
  overrides: Record<string, unknown> = {},
) => ({
  userId: MOCK_USER_ID,
  deviceId: MOCK_DEVICE_ID,
  roleId: MOCK_ROLE_ID,
  roleName: "CLIENT",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
  ...overrides,
});

export const makeRoleWithPermissions = (
  overrides: Record<string, unknown> = {},
) => ({
  id: MOCK_ROLE_ID,
  name: "CLIENT",
  isActive: true,
  deletedAt: null,
  permissions: [
    {
      id: "perm-1",
      path: "/api/users",
      method: "GET",
      deletedAt: null,
    },
  ],
  ...overrides,
});

/**
 * `expect.objectContaining` typed back to the shape it matches, so nesting one
 * matcher inside another stays free of `any` leaking into the assertion.
 */
export const containing = <T extends Record<string, unknown>>(shape: T): T =>
  expect.objectContaining(shape) as unknown as T;
