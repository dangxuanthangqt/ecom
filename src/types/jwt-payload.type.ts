import { Role, User, Device } from "@prisma/client";

type BaseTokenPayload = {
  exp: number;
  iat: number;
};

export type AccessTokenPayloadCreate = {
  userId: User["id"];
  deviceId: Device["id"];
  roleId: Role["id"];
  roleName: Role["name"];
};

export type AccessTokenPayload = BaseTokenPayload & AccessTokenPayloadCreate;

export type RefreshTokenPayloadCreate = {
  userId: User["id"];
  expiresIn?: number; // Rotate refresh token
};

export type RefreshTokenPayload = BaseTokenPayload & RefreshTokenPayloadCreate;
