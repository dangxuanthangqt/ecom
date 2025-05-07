import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";

import { RoleWithPermissionsResponseDto } from "@/dtos/role/role.dto";

export class ProfileResponseDto {
  @ApiProperty({
    description: "Unique identifier of the user",
    example: "123e4567-e89b-12d3-a456-426614174000",
    type: String,
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: "User's full name",
    example: "John Doe",
    type: String,
  })
  @Expose()
  name: string;

  @ApiProperty({
    description: "User's email address",
    example: "john.doe@example.com",
    type: String,
  })
  @Expose()
  email: string;

  @ApiProperty({
    description: "User's phone number",
    example: "0987654321",
    type: String,
  })
  @Expose()
  phoneNumber: string;

  @ApiPropertyOptional({
    description: "URL to user's avatar image",
    example: "https://example.com/avatars/johndoe.jpg",
    type: String,
    nullable: true,
  })
  @Expose()
  avatar: string | null;

  @ApiProperty({
    description: "User's role with associated permissions",
    type: () => RoleWithPermissionsResponseDto,
  })
  @Expose()
  @Type(() => RoleWithPermissionsResponseDto)
  role: RoleWithPermissionsResponseDto;

  constructor(partial: Partial<ProfileResponseDto>) {
    Object.assign(this, partial);
  }
}
