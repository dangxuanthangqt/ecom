import { Expose } from "class-transformer";

export class RoleResponseDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  description?: string;
}
