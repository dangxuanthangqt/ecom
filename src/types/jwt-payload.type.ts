import { Role, User, Device } from "@prisma/client";

export interface AccessTokenPayloadCreate {
  userId: User["id"];
  deviceId: Device["id"];
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
