import { Role, User } from "@prisma/client";

export interface AccessTokenPayloadCreate {
  userId: User["id"];
  deviceId: number;
  roleId: Role["id"];
  roleName: Role["name"];
}

export interface AccessTokenPayload extends AccessTokenPayloadCreate {
  exp: number;
  iat: number;
}

export interface RefreshTokenPayloadCreate {
  userId: User["id"];
}

export interface RefreshTokenPayload extends RefreshTokenPayloadCreate {
  exp: number;
  iat: number;
}
