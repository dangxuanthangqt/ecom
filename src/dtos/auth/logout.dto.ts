import { Expose } from "class-transformer";
import { IsString } from "class-validator";

export class LogoutRequestDto {
  @IsString()
  refreshToken: string;
}

export class LogoutResponseDto {
  @Expose()
  message: string;

  constructor(partial: Partial<LogoutResponseDto>) {
    Object.assign(this, partial);
  }
}
