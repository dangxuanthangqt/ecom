import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsString } from "class-validator";

export class LogoutRequestDto {
  @ApiProperty({
    description: "The refresh token to invalidate",
    example:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
    required: true,
  })
  @IsString()
  refreshToken: string;
}

export class LogoutResponseDto {
  @ApiProperty({
    description: "Message indicating the success of the logout operation",
    example: "Logout successfully.",
  })
  @Expose()
  message: string;

  constructor(partial: Partial<LogoutResponseDto>) {
    Object.assign(this, partial);
  }
}
