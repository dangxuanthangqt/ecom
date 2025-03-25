import { Expose } from "class-transformer";
import { IsString } from "class-validator";

export class RefreshTokenRequestDto {
  @IsString()
  refreshToken: string;
}

export class RefreshTokenResponseDto {
  @Expose()
  accessToken: string;

  @Expose()
  refreshToken: string;

  constructor(partial: Partial<RefreshTokenResponseDto>) {
    Object.assign(this, partial);
  }
}
